const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

interface RedditOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface OAuthClientOptions {
  clientId: string;
  clientSecret: string;
  userAgent: string;
  timeoutMs?: number;
  onRefresh?: (expiresAt: Date) => void;
  fetch?: typeof fetch;
  now?: () => number;
}

export class RedditOAuthError extends Error {
  override name = "RedditOAuthError";
}

const isTokenResponse = (data: unknown): data is RedditOAuthResponse =>
  typeof data === "object" &&
  data !== null &&
  typeof (data as RedditOAuthResponse).access_token === "string" &&
  (data as RedditOAuthResponse).access_token.length > 0 &&
  typeof (data as RedditOAuthResponse).expires_in === "number" &&
  (data as RedditOAuthResponse).expires_in > 0;

export class OAuthClient {
  readonly #authHeader: string;
  readonly #userAgent: string;
  readonly #timeoutMs: number;
  readonly #onRefresh?: (expiresAt: Date) => void;
  readonly #fetch: typeof fetch;
  readonly #now: () => number;

  #token?: string;
  #expiresAt = 0;
  #pending?: Promise<string>;

  constructor(opts: OAuthClientOptions) {
    this.#authHeader = `Basic ${btoa(`${opts.clientId}:${opts.clientSecret}`)}`;
    this.#userAgent = opts.userAgent;
    this.#timeoutMs = opts.timeoutMs ?? 10_000;
    this.#onRefresh = opts.onRefresh;
    this.#fetch = opts.fetch ?? fetch;
    this.#now = opts.now ?? Date.now;
  }

  getAccessToken(): Promise<string> {
    if (this.#token && this.#now() < this.#expiresAt) {
      return Promise.resolve(this.#token);
    }
    this.#pending ??= this.#refresh().finally(() => {
      this.#pending = undefined;
    });
    return this.#pending;
  }

  invalidate(): void {
    this.#token = undefined;
    this.#expiresAt = 0;
  }

  async #refresh(): Promise<string> {
    let response: Response;
    try {
      response = await this.#fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: this.#authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this.#userAgent,
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (cause) {
      throw new RedditOAuthError("Token request failed", { cause });
    }

    if (!response.ok) {
      throw new RedditOAuthError(
        `Token request failed with status ${response.status}`,
      );
    }

    const data: unknown = await response.json().catch(() => undefined);
    if (!isTokenResponse(data)) {
      throw new RedditOAuthError(
        "Token response was missing access_token or expires_in",
      );
    }

    // Refresh access token early
    const marginSeconds = Math.min(300, data.expires_in / 2);
    this.#expiresAt = this.#now() + (data.expires_in - marginSeconds) * 1000;
    this.#token = data.access_token;
    this.#onRefresh?.(new Date(this.#expiresAt));

    return data.access_token;
  }
}
