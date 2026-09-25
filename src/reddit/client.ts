import { type DeepReadonly, type GetOrSetOptions, TtlCache } from "@/lib/cache";
import type { OAuthClient } from "@/reddit/oauth";
import {
  isRedditHost,
  parseRedditPermalink,
  type RedditPermalink,
  stripTrackingParams,
} from "@/reddit/url";
import type {
  CommentChild,
  PostChild,
  RedditAnyListing,
  RedditCommentData,
  RedditPostData,
  RedditPostListing,
  RedditSubredditData,
  SubredditChild,
} from "@/types/reddit";

const API_BASE = "https://oauth.reddit.com";
const THING_ID_PATTERN = /^[a-z0-9]{1,10}$/i;
const SUBREDDIT_PATTERN = /^\w{2,21}$/;
const SHARE_ID_PATTERN = /^[a-z0-9]{1,20}$/i;
const MAX_SHARE_REDIRECTS = 3;

export interface ResolvedShareLink extends RedditPermalink {
  url: string;
}

export interface RedditCacheTtl {
  post: number;
  comment: number;
  subreddit: number;
  shareLink: number;
  /** How long a "not found" result is remembered, in ms */
  notFound: number;
}

export const DEFAULT_CACHE_TTL: RedditCacheTtl = {
  post: 60_000,
  comment: 60_000,
  subreddit: 3_600_000,
  shareLink: 7 * 86_400_000,
  notFound: 30_000,
};

// A ttl of 0 is never stored, but concurrent identical requests still share one load
const NO_CACHE_TTL: RedditCacheTtl = {
  post: 0,
  comment: 0,
  subreddit: 0,
  shareLink: 0,
  notFound: 0,
};

const MAX_CACHE_ENTRIES = {
  post: 1_000,
  comment: 1_000,
  subreddit: 500,
  shareLink: 10_000,
};

export class RedditApiError extends Error {
  override name = "RedditApiError";

  constructor(
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class RedditNotFoundError extends RedditApiError {
  override name = "RedditNotFoundError";

  constructor(message = "Not found on Reddit") {
    super(message, 404);
  }
}

export interface RedditClientOptions {
  oauth: Pick<OAuthClient, "getAccessToken" | "invalidate">;
  userAgent: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Omitted entries default to 0 (not stored). Pass DEFAULT_CACHE_TTL in production. */
  cacheTtl?: Partial<RedditCacheTtl>;
  now?: () => number;
}

export class RedditClient {
  readonly #oauth: RedditClientOptions["oauth"];
  readonly #userAgent: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #ttl: RedditCacheTtl;
  readonly #posts: TtlCache<string, RedditPostData>;
  readonly #comments: TtlCache<
    string,
    { comment: RedditCommentData; post: RedditPostData }
  >;
  readonly #subreddits: TtlCache<string, RedditSubredditData>;
  readonly #shareLinks: TtlCache<string, ResolvedShareLink>;

  constructor(opts: RedditClientOptions) {
    this.#oauth = opts.oauth;
    this.#userAgent = opts.userAgent;
    this.#timeoutMs = opts.timeoutMs ?? 10_000;
    this.#fetch = opts.fetch ?? fetch;
    this.#ttl = { ...NO_CACHE_TTL, ...opts.cacheTtl };
    this.#posts = new TtlCache({
      maxEntries: MAX_CACHE_ENTRIES.post,
      now: opts.now,
    });
    this.#comments = new TtlCache({
      maxEntries: MAX_CACHE_ENTRIES.comment,
      now: opts.now,
    });
    this.#subreddits = new TtlCache({
      maxEntries: MAX_CACHE_ENTRIES.subreddit,
      now: opts.now,
    });
    this.#shareLinks = new TtlCache({
      maxEntries: MAX_CACHE_ENTRIES.shareLink,
      now: opts.now,
    });
  }

  async getPost(id: string): Promise<DeepReadonly<RedditPostData>> {
    assertThingId(id);
    return this.#posts.getOrSet(
      `post:${id.toLowerCase()}`,
      async () => {
        const listing = await this.#get<RedditPostListing>("/api/info", {
          id: `t3_${id}`,
        });
        const post = listing.data?.children?.find(isPost);
        if (!post) throw new RedditNotFoundError(`Post ${id} not found`);
        return post.data;
      },
      this.#cacheOptions(this.#ttl.post),
    );
  }

  async getComment(
    commentId: string,
    postId: string,
  ): Promise<
    DeepReadonly<{ comment: RedditCommentData; post: RedditPostData }>
  > {
    assertThingId(commentId);
    assertThingId(postId);
    return this.#comments.getOrSet(
      `comment:${commentId.toLowerCase()}:${postId.toLowerCase()}`,
      async () => {
        const listing = await this.#get<RedditAnyListing>("/api/info", {
          id: `t1_${commentId},t3_${postId}`,
        });
        const children = listing.data?.children ?? [];
        const comment = children.find(isComment);
        const post = children.find(isPost);
        if (!comment || !post) {
          throw new RedditNotFoundError(`Comment ${commentId} not found`);
        }
        return { comment: comment.data, post: post.data };
      },
      this.#cacheOptions(this.#ttl.comment),
    );
  }

  async getSubreddit(name: string): Promise<DeepReadonly<RedditSubredditData>> {
    if (!SUBREDDIT_PATTERN.test(name)) {
      throw new RedditNotFoundError(`Invalid subreddit name`);
    }
    return this.#subreddits.getOrSet(
      `sub:${name.toLowerCase()}`,
      async () => {
        const about = await this.#get<SubredditChild>(`/r/${name}/about`);
        if (about.kind !== "t5" || !about.data) {
          throw new RedditNotFoundError(`Subreddit ${name} not found`);
        }
        return about.data;
      },
      this.#cacheOptions(this.#ttl.subreddit),
    );
  }

  // Share links (/r/<sub>/s/<id>) redirect to the canonical permalink with tracking params
  async resolveShareLink(
    subreddit: string,
    id: string,
  ): Promise<DeepReadonly<ResolvedShareLink>> {
    if (!SUBREDDIT_PATTERN.test(subreddit) || !SHARE_ID_PATTERN.test(id)) {
      throw new RedditNotFoundError("Invalid share link");
    }
    // Both parts are case-sensitive (wrong case for either part redirects to the subreddit page)
    return this.#shareLinks.getOrSet(
      `share:${subreddit}:${id}`,
      () => this.#followShareLink(subreddit, id),
      this.#cacheOptions(this.#ttl.shareLink),
    );
  }

  async #followShareLink(
    subreddit: string,
    id: string,
  ): Promise<ResolvedShareLink> {
    let url = new URL(`/r/${subreddit}/s/${id}`, API_BASE);
    for (let hop = 0; hop < MAX_SHARE_REDIRECTS; hop++) {
      const response = await this.#send(url, {
        method: "HEAD",
        redirect: "manual",
      });

      if (response.status < 300 || response.status >= 400) {
        if (response.status === 404) throw new RedditNotFoundError();
        throw new RedditApiError(
          `Share link resolution failed with status code ${response.status}`,
          response.status,
        );
      }

      const location = response.headers.get("location");
      if (!location) break;
      const next = new URL(location, url);
      // Never follow a redirect off Reddit
      if (next.protocol !== "https:" || !isRedditHost(next.hostname)) break;

      const permalink = parseRedditPermalink(next.pathname);
      if (permalink) {
        return {
          url: stripTrackingParams(next).toString(),
          ...permalink,
        };
      }
      url = next;
    }

    throw new RedditNotFoundError(
      "Share link did not resolve to a post or comment",
    );
  }

  #cacheOptions(ttlMs: number): GetOrSetOptions {
    return {
      ttlMs,
      // Only remember "not found"; rate limits and server errors must be retried
      errorTtlMs: (error) =>
        error instanceof RedditNotFoundError ? this.#ttl.notFound : undefined,
    };
  }

  async #get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(path, API_BASE);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    // Without raw_json Reddit HTML-escapes text (&gt; &amp; &lt;)
    url.searchParams.set("raw_json", "1");

    const response = await this.#send(url);

    if (response.status === 404) throw new RedditNotFoundError();
    if (!response.ok) {
      throw new RedditApiError(
        `Reddit request to ${url.pathname} failed with status code ${response.status}`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new RedditApiError(
        `Reddit response for ${url.pathname} was not valid JSON`,
        response.status,
        { cause },
      );
    }
  }

  async #send(url: URL, init: RequestInit = {}): Promise<Response> {
    const response = await this.#request(url, init);
    if (response.status !== 401) return response;
    // The token may have been revoked early
    this.#oauth.invalidate();
    return this.#request(url, init);
  }

  async #request(url: URL, init: RequestInit): Promise<Response> {
    const token = await this.#oauth.getAccessToken();
    try {
      return await this.#fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": this.#userAgent,
        },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (cause) {
      throw new RedditApiError(
        `Reddit request to ${url.pathname} failed`,
        502,
        { cause },
      );
    }
  }
}

const assertThingId = (id: string) => {
  if (!THING_ID_PATTERN.test(id)) {
    throw new RedditNotFoundError(`Invalid Reddit ID`);
  }
};

const isPost = (child: { kind: string }): child is PostChild =>
  child.kind === "t3";

const isComment = (child: { kind: string }): child is CommentChild =>
  child.kind === "t1";
