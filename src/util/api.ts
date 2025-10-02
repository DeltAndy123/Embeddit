import axios from "axios";
import { oauth } from "../redditClient";
import { USER_AGENT } from "../consts";
import { getFromCache, setInCache } from "./cache";
import { logger } from "./log";

export async function getRedditData<T = any>(endpoint: string) {
  if (oauth.enabled && oauth.client) {
    return await axios.get<T>(`https://oauth.reddit.com${endpoint}`, {
      headers: {
        "Authorization": "Bearer " + await oauth.client.getAccessToken(),
        "User-Agent": USER_AGENT
      }
    });
  } else {
    return await axios.get<T>(`https://api.reddit.com${endpoint}`, {
      headers: {
        "User-Agent": USER_AGENT
      }
    });
  }
}

// Share links are https://reddit.com/r/[subreddit]/s/[id] and contain tracking parameters
export async function resolveShareLink(subreddit: string, id: string, stripTrackingParams: boolean = true): Promise<string | null> {
  const cacheKey = `${subreddit}:${id}`;
  const cachedValue = getFromCache(cacheKey);
  if (cachedValue) {
    logger.debug("Cache hit for", cacheKey, "->", cachedValue);
    return cachedValue;
  }

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT
  };
  if (oauth.enabled && oauth.client) {
    headers["Authorization"] = "Bearer " + await oauth.client.getAccessToken();
  }
  const response = await axios.head(`https://www.reddit.com/r/${subreddit}/s/${id}`, {
    headers
  });
  const url = response.request?.res?.responseUrl;
  if (!url) return null;
  if (!stripTrackingParams) return url;
  const urlObj = new URL(url);
  urlObj.searchParams.delete("share_id");
  urlObj.searchParams.delete("utm_content");
  urlObj.searchParams.delete("utm_medium");
  urlObj.searchParams.delete("utm_name");
  urlObj.searchParams.delete("utm_source");
  urlObj.searchParams.delete("utm_term");

  setInCache(cacheKey, urlObj.toString());

  return urlObj.toString();
}