import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CACHE_TTL,
  RedditApiError,
  RedditClient,
  type RedditClientOptions,
  RedditNotFoundError,
} from "@/reddit/client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const listing = (...children: { kind: string; data: object }[]) => ({
  kind: "Listing",
  data: { children },
});

const post = (id = "abc123") => listing({ kind: "t3", data: { id } });

const redirect = (location: string) =>
  new Response(null, { status: 301, headers: { location } });

const setup = (
  handler: (url: URL) => Response | Promise<Response>,
  cacheTtl: RedditClientOptions["cacheTtl"] = DEFAULT_CACHE_TTL,
) => {
  let time = 0;
  const requests: URL[] = [];
  const client = new RedditClient({
    oauth: { getAccessToken: async () => "token", invalidate() {} },
    userAgent: "test-agent",
    fetch: (async (url: URL) => {
      requests.push(url);
      return handler(url);
    }) as unknown as typeof fetch,
    cacheTtl,
    now: () => time,
  });
  return {
    client,
    requests,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe("RedditClient caching", () => {
  test("stores nothing when no ttl is configured", async () => {
    const { client, requests } = setup(() => json(post()), {});

    await client.getPost("abc123");
    await client.getPost("abc123");

    expect(requests).toHaveLength(2);
  });

  test("still shares concurrent identical requests without a ttl", async () => {
    const { client, requests } = setup(async () => {
      await Bun.sleep(10);
      return json(post());
    }, {});

    await Promise.all([
      client.getPost("abc123"),
      client.getPost("abc123"),
      client.getPost("abc123"),
    ]);

    expect(requests).toHaveLength(1);
  });

  test("serves posts from cache until the ttl passes", async () => {
    const { client, requests, advance } = setup(() => json(post()));

    await client.getPost("abc123");
    advance(DEFAULT_CACHE_TTL.post - 1);
    await client.getPost("abc123");
    expect(requests).toHaveLength(1);

    advance(1);
    await client.getPost("abc123");
    expect(requests).toHaveLength(2);
  });

  test("treats thing ids as case-insensitive", async () => {
    const { client, requests } = setup(() => json(post()));

    await client.getPost("ABC123");
    await client.getPost("abc123");

    expect(requests).toHaveLength(1);
  });

  test("caches comments and subreddits", async () => {
    const { client, requests } = setup((url) =>
      url.pathname === "/api/info"
        ? json(
            listing(
              { kind: "t1", data: { id: "c1" } },
              { kind: "t3", data: { id: "p1" } },
            ),
          )
        : json({ kind: "t5", data: { display_name: "sub" } }),
    );

    await client.getComment("c1", "p1");
    await client.getComment("C1", "P1");
    await client.getSubreddit("Sub");
    await client.getSubreddit("sub");

    expect(requests).toHaveLength(2);
  });

  test("share links: the subreddit and the share id are both case-sensitive", async () => {
    const { client, requests } = setup(() =>
      redirect("https://www.reddit.com/r/sub/comments/abc123/title/"),
    );

    await client.resolveShareLink("sub", "AbCdEf1234");
    await client.resolveShareLink("sub", "AbCdEf1234");
    expect(requests).toHaveLength(1);

    await client.resolveShareLink("Sub", "AbCdEf1234");
    expect(requests).toHaveLength(2);

    await client.resolveShareLink("sub", "abcdef1234");
    expect(requests).toHaveLength(3);
  });

  test("remembers not found for a short time", async () => {
    const { client, requests, advance } = setup(() => json({}, 404));

    expect(client.getPost("abc123")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(client.getPost("abc123")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(requests).toHaveLength(1);

    advance(DEFAULT_CACHE_TTL.notFound);
    expect(client.getPost("abc123")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(requests).toHaveLength(2);
  });

  test("never caches rate limits or server errors", async () => {
    const { client, requests } = setup(() => json({}, 429));

    expect(client.getPost("abc123")).rejects.toBeInstanceOf(RedditApiError);
    expect(client.getPost("abc123")).rejects.toBeInstanceOf(RedditApiError);

    expect(requests).toHaveLength(2);
  });

  test("a failed request does not poison the cache for later successes", async () => {
    let fail = true;
    const { client, requests } = setup(() =>
      fail ? json({}, 500) : json(post()),
    );

    expect(client.getPost("abc123")).rejects.toBeInstanceOf(RedditApiError);
    fail = false;
    expect((await client.getPost("abc123")).id).toBe("abc123");
    expect(requests).toHaveLength(2);
  });
});
