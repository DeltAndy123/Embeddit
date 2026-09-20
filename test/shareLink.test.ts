import { describe, expect, test } from "bun:test";
import { RedditApiError, RedditClient, RedditNotFoundError } from "@/reddit/client";

const redirect = (location: string | null, status = 301) =>
  new Response(null, {
    status,
    headers: location ? { location } : {},
  });

const setup = (handler: (url: URL, init: RequestInit) => Response) => {
  const requests: { url: URL; init: RequestInit }[] = [];
  const client = new RedditClient({
    oauth: { getAccessToken: async () => "token", invalidate() {} },
    userAgent: "test-agent",
    fetch: (async (url: URL, init: RequestInit) => {
      requests.push({ url, init });
      return handler(url, init);
    }) as unknown as typeof fetch,
  });
  return { client, requests };
};

const REAL_LOCATION =
  "https://www.reddit.com/r/geometrydash/comments/1nv7724/minecraft_just_surpassed_robtop_games/?share_id=w44sYdWVwcBg2jqVgPPKq&utm_content=1&utm_medium=ios_app&utm_name=ioscss&utm_source=share&utm_term=1";

describe("RedditClient.resolveShareLink", () => {
  test("resolves a share link in one hop and strips tracking params", async () => {
    const { client, requests } = setup(() => redirect(REAL_LOCATION));

    const resolved = await client.resolveShareLink("geometrydash", "OFdMEx2bJH");

    expect(resolved).toEqual({
      url: "https://www.reddit.com/r/geometrydash/comments/1nv7724/minecraft_just_surpassed_robtop_games/",
      postId: "1nv7724",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url.toString()).toBe(
      "https://oauth.reddit.com/r/geometrydash/s/OFdMEx2bJH",
    );
    expect(requests[0]!.init.method).toBe("HEAD");
    expect(requests[0]!.init.redirect).toBe("manual");
  });

  test("returns the comment id for comment share links", async () => {
    const { client } = setup(() =>
      redirect("https://www.reddit.com/r/sub/comments/abc123/title/def456/?utm_source=share"),
    );

    const resolved = await client.resolveShareLink("sub", "SHAREID");

    expect(resolved.postId).toBe("abc123");
    expect(resolved.commentId).toBe("def456");
  });

  test("follows an intermediate redirect on reddit", async () => {
    let calls = 0;
    const { client, requests } = setup(() =>
      ++calls === 1
        ? redirect("https://www.reddit.com/r/sub/s/OTHER")
        : redirect("https://www.reddit.com/r/sub/comments/abc123/title/"),
    );

    const resolved = await client.resolveShareLink("sub", "SHAREID");

    expect(resolved.postId).toBe("abc123");
    expect(requests).toHaveLength(2);
  });

  test("never follows a redirect to another host", async () => {
    const { client, requests } = setup(() =>
      redirect("https://evil.example.com/r/sub/comments/abc123/title/"),
    );

    expect(client.resolveShareLink("sub", "SHAREID")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(requests).toHaveLength(1);
  });

  test("rejects a redirect that is not a post", async () => {
    const { client } = setup(() => redirect("https://www.reddit.com/r/sub/"));
    expect(client.resolveShareLink("sub", "SHAREID")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
  });

  test("gives up after too many hops", async () => {
    const { client, requests } = setup(() => redirect("https://www.reddit.com/r/sub/s/LOOP"));
    expect(client.resolveShareLink("sub", "SHAREID")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(requests.length).toBeLessThanOrEqual(3);
  });

  test("maps 404 and other statuses to typed errors", async () => {
    const missing = setup(() => new Response(null, { status: 404 }));
    expect(missing.client.resolveShareLink("sub", "SHAREID")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );

    const limited = setup(() => new Response(null, { status: 429 }));
    const error = await limited.client.resolveShareLink("sub", "SHAREID").catch((e) => e);
    expect(error).toBeInstanceOf(RedditApiError);
    expect(error.status).toBe(429);
  });

  test("invalid input never reaches the network", async () => {
    const { client, requests } = setup(() => redirect(REAL_LOCATION));

    expect(client.resolveShareLink("a/b", "SHAREID")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(client.resolveShareLink("sub", "../x")).rejects.toBeInstanceOf(
      RedditNotFoundError,
    );
    expect(requests).toHaveLength(0);
  });
});
