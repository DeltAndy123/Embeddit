import "dotenv/config";
import { OAuthClient } from "./util/oauth";

export const oauth = {
  enabled: !process.env.DONT_USE_OAUTH,
  client: null as OAuthClient | null
}

if (process.env.DONT_USE_OAUTH) {
  console.log("OAuth is disabled; using public Reddit API");
  console.warn("Note: The public API is rate-limited and blocks a lot of commercial VPS IPs. Use OAuth for production environments.");
} else {
  if (!process.env.REDDIT_CLIENT_ID) {
    throw new Error("REDDIT_CLIENT_ID environment variable not set");
  }
  if (!process.env.REDDIT_CLIENT_SECRET) {
    throw new Error("REDDIT_CLIENT_SECRET environment variable not set");
  }

  oauth.client = new OAuthClient(process.env.REDDIT_CLIENT_ID, process.env.REDDIT_CLIENT_SECRET);
}