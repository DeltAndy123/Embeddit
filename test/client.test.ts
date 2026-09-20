import { describe, expect, test } from "bun:test";
import {
  RedditApiError,
  RedditClient,
  RedditNotFoundError,
} from "@/reddit/client";
import { nth } from "./helpers";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const listing = (...children: { kind: string; data: object }[]) => ({
  kind: "Listing",
  data: { children },
});

const setup = (handler: (url: URL, init: RequestInit) => Response) => {
  const requests: { url: URL; init: RequestInit }[] = [];
  let invalidated = 0;
  let tokenCount = 0;
  const client = new RedditClient({
    oauth: {
      getAccessToken: async () => `token${++tokenCount}`,
      invalidate: () => {
        invalidated++;
      },
    },
    userAgent: "test-agent",
    fetch: (async (url: URL, init: RequestInit) => {
      requests.push({ url, init });
      return handler(url, init);
    }) as unknown as typeof fetch,
  });
  return { client, requests, invalidated: () => invalidated };
};

describe("RedditClient", () => {
  test("requests the oauth host with auth, user agent and raw_json", async () => {
    const { client, requests } = setup(() =>
      json(listing({ kind: "t3", data: { id: "abc123", title: "Hi" } })),
    );

    const post = await client.getPost("abc123");

    expect(post.title).toBe("Hi");
    const { url, init } = nth(requests, 0);
    expect(url.origin).toBe("https://oauth.reddit.com");
    expect(url.pathname).toBe("/api/info");
    expect(url.searchParams.get("id")).toBe("t3_abc123");
    expect(url.searchParams.get("raw_json")).toBe("1");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token1");
    expect(headers["User-Agent"]).toBe("test-agent");
  });

  test("an empty listing is a not found error, not a crash", async () => {
    const { client } = setup(() => json(listing()));
    expect(client.getPost("abc123")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
  });

  test("finds the comment and post regardless of listing order", async () => {
    const { client } = setup(() =>
      json(
        listing(
          { kind: "t3", data: { id: "p1" } },
          { kind: "t1", data: { id: "c1" } },
        ),
      ),
    );

    const { comment, post } = await client.getComment("c1", "p1");

    expect(comment).toEqual({ id: "c1" } as never);
    expect(post).toEqual({ id: "p1" } as never);
  });

  test("invalid ids never reach the network", async () => {
    const { client, requests } = setup(() => json(listing()));

    expect(client.getPost("../etc")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(client.getSubreddit("a/b")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(requests).toHaveLength(0);
  });

  test("retries once with a fresh token after a 401", async () => {
    let calls = 0;
    const { client, requests, invalidated } = setup(() =>
      ++calls === 1
        ? json({}, 401)
        : json(listing({ kind: "t3", data: { id: "abc123" } })),
    );

    await client.getPost("abc123");

    expect(requests).toHaveLength(2);
    expect(invalidated()).toBe(1);
    const second = nth(requests, 1).init.headers as Record<string, string>;
    expect(second.Authorization).toBe("Bearer token2");
  });

  test("does not retry forever on repeated 401s", async () => {
    const { client, requests } = setup(() => json({}, 401));
    expect(client.getPost("abc123")).rejects.toMatchObject({
      status: 401,
    });
    expect(requests).toHaveLength(2);
  });

  test("maps 404 and other failures to typed errors", async () => {
    const notFound = setup(() => json({}, 404));
    expect(notFound.client.getSubreddit("nope")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );

    const limited = setup(() => json({}, 429));
    const error = await limited.client.getPost("abc123").catch((e) => e);
    expect(error).toBeInstanceOf(RedditApiError);
    expect(error.status).toBe(429);
  });

  test("network failures become RedditApiError without leaking headers", async () => {
    const client = new RedditClient({
      oauth: { getAccessToken: async () => "secret-token", invalidate() {} },
      userAgent: "test-agent",
      fetch: (async () => {
        throw new TypeError("connection reset");
      }) as unknown as typeof fetch,
    });

    const error = await client.getPost("abc123").catch((e) => e);

    expect(error).toBeInstanceOf(RedditApiError);
    expect(String(error)).not.toContain("secret-token");
  });
});
