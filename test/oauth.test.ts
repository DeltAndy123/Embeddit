import { describe, expect, test } from "bun:test";
import { OAuthClient, RedditOAuthError } from "@/reddit/oauth";

const tokenResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const makeClient = (
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response>,
  now = () => 0,
) =>
  new OAuthClient({
    clientId: "id",
    clientSecret: "super-secret",
    userAgent: "test-agent",
    fetch: fetchImpl as typeof fetch,
    now,
  });

describe("OAuthClient", () => {
  test("shares one request between concurrent callers", async () => {
    let calls = 0;
    const client = makeClient(async () => {
      calls++;
      await Bun.sleep(10);
      return tokenResponse({
        access_token: "abc",
        token_type: "bearer",
        expires_in: 3600,
      });
    });

    const tokens = await Promise.all([
      client.getAccessToken(),
      client.getAccessToken(),
      client.getAccessToken(),
    ]);

    expect(tokens).toEqual(["abc", "abc", "abc"]);
    expect(calls).toBe(1);
  });

  test("caches the token until shortly before it expires, then refreshes", async () => {
    let calls = 0;
    let time = 0;
    const client = makeClient(
      async () => {
        calls++;
        return tokenResponse({
          access_token: `t${calls}`,
          token_type: "bearer",
          expires_in: 3600,
        });
      },
      () => time,
    );

    expect(await client.getAccessToken()).toBe("t1");
    time = 3_000_000; // under 3600s - 300s margin
    expect(await client.getAccessToken()).toBe("t1");
    time = 3_400_000; // past the margin
    expect(await client.getAccessToken()).toBe("t2");
    expect(calls).toBe(2);
  });

  test("sends basic auth and a user agent", async () => {
    let init: RequestInit | undefined;
    const client = makeClient(async (_url, i) => {
      init = i;
      return tokenResponse({
        access_token: "abc",
        token_type: "bearer",
        expires_in: 3600,
      });
    });

    await client.getAccessToken();

    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${btoa("id:super-secret")}`);
    expect(headers["User-Agent"]).toBe("test-agent");
  });

  test("rejects malformed responses instead of caching undefined", async () => {
    const client = makeClient(async () =>
      tokenResponse({ error: "invalid_grant" }),
    );
    expect(client.getAccessToken()).rejects.toBeInstanceOf(RedditOAuthError);
  });

  test("errors never contain the client secret, and a failure does not poison later calls", async () => {
    let fail = true;
    const client = makeClient(async () =>
      fail
        ? tokenResponse({ error: "nope" }, 401)
        : tokenResponse({
            access_token: "abc",
            token_type: "bearer",
            expires_in: 3600,
          }),
    );

    const error = await client.getAccessToken().catch((e: Error) => e);
    expect(String(error)).not.toContain("super-secret");
    expect(
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    ).not.toContain("super-secret");

    fail = false;
    expect(await client.getAccessToken()).toBe("abc");
  });
});
