import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  buildErrorEmbed,
  type ErrorEmbedOptions,
} from "@/embed/builders/error";
import { logger } from "@/lib/log";
import { RedditApiError, RedditNotFoundError } from "@/reddit/client";
import type { AppEnv } from "@/services";
import { EmbedPage } from "@/views/EmbedPage";

type ErrorText = Pick<ErrorEmbedOptions, "title" | "message">;

/**
 * Fixed, user-facing text for an error. Never includes `error.message`, which
 * can contain internals and would be visible to everyone in Discord.
 */
export const describeError = (error: unknown): ErrorText => {
  if (error instanceof RedditNotFoundError) {
    return {
      title: "Not found",
      message: "This post or community doesn't exist, or it was removed.",
    };
  }
  if (error instanceof RedditApiError && error.status === 403) {
    return {
      title: "Private or restricted",
      message: "This community is private or restricted.",
    };
  }
  if (error instanceof RedditApiError && error.status === 429) {
    return {
      title: "Rate limited",
      message:
        "Reddit is limiting requests right now. Try again in a few minutes.",
    };
  }
  return {
    title: "Couldn't load this from Reddit",
    message: "Something went wrong. Try again later.",
  };
};

const logError = (error: unknown) => {
  if (error instanceof RedditNotFoundError) {
    logger.debug(error.message);
  } else if (error instanceof RedditApiError) {
    logger.warn(`${error.name} (${error.status}): ${error.message}`);
  } else {
    logger.error(error);
  }
};

// Only the embed routes are hit by Discord's crawler (botOnly redirects everyone
// else), so only they get an embed response. Anything else gets a plain status.
const isEmbedPath = (path: string) => path.startsWith("/r/");

// Discord doesn't render an embed from a non-2xx response, so errors on embed
// routes are sent as 200 with an error embed instead.
const errorEmbedResponse = (
  c: Parameters<ErrorHandler<AppEnv>>[1],
  options: ErrorEmbedOptions,
) => {
  // Discord may cache this; ask it not to (honoring this is untested)
  c.header("Cache-Control", "no-store");
  return c.html(<EmbedPage embed={buildErrorEmbed(options)} />);
};

export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof HTTPException) return error.getResponse();

  logError(error);
  if (!isEmbedPath(c.req.path)) return c.text("Internal Server Error", 500);

  try {
    return errorEmbedResponse(c, { ...describeError(error), path: c.req.path });
  } catch (renderError) {
    // Must never throw from an error handler
    logger.error("Failed to render error embed:", renderError);
    return c.text("Internal Server Error", 500);
  }
};

export const handleNotFound: NotFoundHandler<AppEnv> = (c) => {
  if (!isEmbedPath(c.req.path)) return c.text("Not Found", 404);

  return errorEmbedResponse(c, {
    title: "Unsupported link",
    message: "This type of Reddit link isn't supported.",
    path: c.req.path,
  });
};
