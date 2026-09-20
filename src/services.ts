import type { Config } from "@/config";
import { logger } from "@/lib/log";
import { DEFAULT_CACHE_TTL, RedditClient } from "@/reddit/client";
import { OAuthClient } from "@/reddit/oauth";

export const createServices = (config: Config) => {
  const oauth = new OAuthClient({
    clientId: config.reddit.clientId,
    clientSecret: config.reddit.clientSecret,
    userAgent: config.reddit.userAgent,
    onRefresh: (refreshAt) =>
      logger.info(
        "Refreshed Reddit access token, next refresh at",
        refreshAt.toLocaleString(),
      ),
  });

  const reddit = new RedditClient({
    oauth,
    userAgent: config.reddit.userAgent,
    cacheTtl: DEFAULT_CACHE_TTL,
  });

  return { reddit };
};

export type Services = ReturnType<typeof createServices>;

export type AppEnv = { Variables: { services: Services } };
