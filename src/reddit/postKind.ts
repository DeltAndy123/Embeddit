import type { DeepReadonly } from "@/lib/cache";
import type { ApiVideo, RedditPostData } from "@/types/reddit";

type Post = DeepReadonly<RedditPostData>;

export interface GalleryItem {
  url: string;
  caption?: string;
}

/** What a post is showing, with just the data each kind needs */
export type PostContent =
  | { kind: "removed" }
  | { kind: "gallery"; items: GalleryItem[] }
  | { kind: "video"; video: DeepReadonly<ApiVideo>; poster?: string }
  | { kind: "image"; url: string }
  | { kind: "link"; url: string; domain: string; preview?: string }
  | { kind: "text" };

export type PostKind =
  | PostContent
  | { kind: "crosspost"; parent: Post; content: PostContent };

const isRemoved = (post: Post) =>
  Boolean(post.removed_by_category) ||
  post.selftext === "[removed]" ||
  post.selftext === "[deleted]";

const previewImage = (post: Post): string | undefined =>
  post.preview?.images[0]?.source.url;

// Ordered by gallery_data (media_metadata is keyed by id and has no order)
const galleryItems = (post: Post): GalleryItem[] =>
  (post.gallery_data?.items ?? []).flatMap((item) => {
    if (item.is_deleted) return [];
    const media = post.media_metadata?.[item.media_id];
    if (media?.status !== "valid") return [];
    const url = media.s.u ?? media.s.gif;
    if (!url) return [];
    return [{ url, ...(item.caption ? { caption: item.caption } : {}) }];
  });

const redditVideo = (post: Post) =>
  post.secure_media?.reddit_video ?? post.media?.reddit_video;

const classifyContent = (post: Post): PostContent => {
  if (isRemoved(post)) return { kind: "removed" };

  if (post.is_gallery) {
    const items = galleryItems(post);
    if (items.length > 0) return { kind: "gallery", items };
  }

  const video = redditVideo(post);
  if (post.is_video && video) {
    const poster = previewImage(post);
    return { kind: "video", video, ...(poster ? { poster } : {}) };
  }

  if (post.post_hint === "image") return { kind: "image", url: post.url };

  if (post.is_self) return { kind: "text" };

  // Everything else (external links, YouTube, unknown future types) is a link
  const preview = previewImage(post);
  return {
    kind: "link",
    url: post.url,
    domain: post.domain,
    ...(preview ? { preview } : {}),
  };
};

/**
 * Decides what kind of post this is. Checks run in a fixed order because the
 * fields overlap (a crosspost also has a `url`, a video also has a preview).
 */
export const classifyPost = (post: Post): PostKind => {
  // A crosspost shows the original's content, unless the crosspost itself was removed
  const parent = post.crosspost_parent_list?.[0];
  if (parent && !isRemoved(post)) {
    return { kind: "crosspost", parent, content: classifyContent(parent) };
  }
  return classifyContent(post);
};
