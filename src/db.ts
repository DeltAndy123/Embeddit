import "dotenv/config";
import {OAuthClient} from "./oauth";

if (!process.env.REDDIT_CLIENT_ID) {
  throw new Error("REDDIT_CLIENT_ID environment variable not set");
}
if (!process.env.REDDIT_CLIENT_SECRET) {
  throw new Error("REDDIT_CLIENT_ID environment variable not set");
}

export const oauthClient = new OAuthClient(process.env.REDDIT_CLIENT_ID, process.env.REDDIT_CLIENT_SECRET);