import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { buildErrorEmbed } from "@/embed/builders/error";
import { assertValidEmbed } from "@/embed/validate";
import { describeError, handleError, handleNotFound } from "@/errors";
import { RedditApiError, RedditNotFoundError } from "@/reddit/client";
import type { AppEnv } from "@/services";

const setup = (thrown: unknown) => {
  const app = new Hono<AppEnv>();
  app.get("/r/:subreddit", () => {
    throw thrown;
  });
  app.get("/other", () => {
    throw thrown;
  });
  app.onError(handleError);
  app.notFound(handleNotFound);
  return app;
};

describe("describeError", () => {
  test("maps known reddit failures to fixed text", () => {
    expect(describeError(new RedditNotFoundError()).title).toBe("Not found");
    expect(describeError(new RedditApiError("x", 403)).title).toBe(
      "Private or restricted",
    );
    expect(describeError(new RedditApiError("x", 429)).title).toBe(
      "Rate limited",
    );
  });

  test("falls back to generic text for everything else", () => {
    const generic = describeError(new Error("boom")).title;
    expect(describeError(new RedditApiError("x", 500)).title).toBe(generic);
    expect(describeError("a string").title).toBe(generic);
  });

  test("never includes the error message", () => {
    const { title, message } = describeError(
      new RedditApiError("token=secret123", 500),
    );
    expect(`${title} ${message}`).not.toContain("secret123");
  });
});

describe("buildErrorEmbed", () => {
  test("builds a valid embed with or without a Reddit button", () => {
    const withPath = buildErrorEmbed({
      title: "T",
      message: "M",
      path: "/r/a",
    });
    const without = buildErrorEmbed({ title: "T", message: "M" });

    assertValidEmbed(withPath);
    assertValidEmbed(without);
    expect(withPath.component.components).toHaveLength(2);
    expect(without.component.components).toHaveLength(1);
  });
});

describe("error handlers", () => {
  // Handlers log server-side; keep the test output quiet
  beforeEach(() => {
    spyOn(console, "error").mockImplementation(() => {});
    spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    (console.error as unknown as { mockRestore(): void }).mockRestore();
    (console.warn as unknown as { mockRestore(): void }).mockRestore();
  });

  test("a missing subreddit returns 200 with an error embed", async () => {
    const res = await setup(new RedditNotFoundError()).request("/r/nope");
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(body).toContain("discord:component-embed");
    expect(body).toContain("Not found");
    expect(body).toContain("https://reddit.com/r/nope");
  });

  test("unexpected errors show generic text and leak nothing", async () => {
    const res = await setup(new Error("secret internals")).request("/r/aww");
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(body).toContain("Couldn't load this from Reddit");
    expect(body).not.toContain("secret internals");
  });

  test("errors outside the embed routes are a plain 500", async () => {
    const res = await setup(new Error("boom")).request("/other");

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Internal Server Error");
  });

  test("HTTPException responses pass through untouched", async () => {
    const res = await setup(
      new HTTPException(418, { message: "teapot" }),
    ).request("/other");

    expect(res.status).toBe(418);
  });

  test("an unmatched embed route gets an embed, others a real 404", async () => {
    const app = setup(new Error("unused"));

    const embed = await app.request("/r/aww/unknown/thing/x");
    expect(embed.status).toBe(200);
    expect(await embed.text()).toContain("Unsupported link");

    const plain = await app.request("/nothing");
    expect(plain.status).toBe(404);
  });
});
