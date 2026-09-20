export interface RedditPermalink {
  postId: string;
  commentId?: string;
}

// /r/<sub>/comments/<post>[/<slug>[/<comment>]] (also /user/ and /u/ profile posts)
const PERMALINK_PATTERN =
  /^\/(?:r|u|user)\/[^/]+\/comments\/([a-z0-9]{1,10})(?:\/[^/]+(?:\/([a-z0-9]{1,10}))?)?\/?$/i;

export const parseRedditPermalink = (pathname: string): RedditPermalink | null => {
  const match = PERMALINK_PATTERN.exec(pathname);
  if (!match?.[1]) return null;
  return match[2]
    ? { postId: match[1], commentId: match[2] }
    : { postId: match[1] };
};

export const isRedditHost = (hostname: string) =>
  hostname === "reddit.com" || hostname.endsWith(".reddit.com");

export const stripTrackingParams = (url: URL): URL => {
  const clean = new URL(url);
  for (const key of [...clean.searchParams.keys()]) {
    if (key === "share_id" || key.startsWith("utm_")) {
      clean.searchParams.delete(key);
    }
  }
  return clean;
};
