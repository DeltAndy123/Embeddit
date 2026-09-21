import { describe, expect, test } from "bun:test";
import { classifyPost } from "@/reddit/postKind";
import type { ApiVideo, RedditPostData } from "@/types/reddit";

const post = (overrides: Partial<RedditPostData> = {}) =>
  ({
    id: "abc123",
    is_self: false,
    is_video: false,
    selftext: "",
    removed_by_category: null,
    url: "https://example.com/article",
    domain: "example.com",
    media: null,
    secure_media: null,
    ...overrides,
  }) as RedditPostData;

const video = { fallback_url: "https://v.redd.it/x/DASH_720.mp4" } as ApiVideo;

const preview = (url: string): RedditPostData["preview"] => ({
  enabled: true,
  images: [
    {
      id: "p",
      source: { url, width: 1, height: 1 },
      resolutions: [],
      variants: {},
    },
  ],
});

const media = (
  id: string,
  source: { u?: string; gif?: string; mp4?: string },
  status: "valid" | "invalid" | "deleted" = "valid",
  e: "Image" | "AnimatedImage" = "Image",
) => ({
  status,
  e,
  m: "image/jpg",
  p: [],
  s: { x: 1, y: 1, ...source },
  id,
});

describe("classifyPost", () => {
  describe("text and link", () => {
    test("self posts are text", () => {
      expect(classifyPost(post({ is_self: true, selftext: "hello" }))).toEqual({
        kind: "text",
      });
    });

    test("external posts are links with an optional preview image", () => {
      expect(
        classifyPost(
          post({ preview: preview("https://preview.redd.it/a.jpg") }),
        ),
      ).toEqual({
        kind: "link",
        url: "https://example.com/article",
        domain: "example.com",
        preview: "https://preview.redd.it/a.jpg",
      });
    });

    test("a link without a preview omits the key", () => {
      const result = classifyPost(post());

      expect(result.kind).toBe("link");
      expect("preview" in result).toBe(false);
    });

    test("unknown post hints (e.g. YouTube) fall back to a link", () => {
      expect(classifyPost(post({ post_hint: "rich:video" })).kind).toBe("link");
    });
  });

  describe("image", () => {
    test("post_hint image uses the post url", () => {
      expect(
        classifyPost(
          post({ post_hint: "image", url: "https://i.redd.it/pic.jpg" }),
        ),
      ).toEqual({ kind: "image", url: "https://i.redd.it/pic.jpg" });
    });
  });

  describe("video", () => {
    test("uses secure_media with the preview as the poster", () => {
      expect(
        classifyPost(
          post({
            is_video: true,
            secure_media: { reddit_video: video },
            preview: preview("https://preview.redd.it/poster.jpg"),
          }),
        ),
      ).toEqual({
        kind: "video",
        video,
        poster: "https://preview.redd.it/poster.jpg",
      });
    });

    test("falls back to media when secure_media is missing", () => {
      const result = classifyPost(
        post({ is_video: true, media: { reddit_video: video } }),
      );

      expect(result).toEqual({ kind: "video", video });
      expect("poster" in result).toBe(false);
    });

    test("is_video without video data is treated as a link", () => {
      expect(classifyPost(post({ is_video: true })).kind).toBe("link");
    });
  });

  describe("gallery", () => {
    test("follows gallery_data order, not media_metadata order", () => {
      const result = classifyPost(
        post({
          is_gallery: true,
          gallery_data: {
            items: [
              { media_id: "b", id: 2 },
              { media_id: "a", id: 1 },
            ],
          },
          media_metadata: {
            a: media("a", { u: "https://i.redd.it/a.jpg" }),
            b: media("b", { u: "https://i.redd.it/b.jpg" }),
          },
        }),
      );

      expect(result).toEqual({
        kind: "gallery",
        items: [
          { url: "https://i.redd.it/b.jpg" },
          { url: "https://i.redd.it/a.jpg" },
        ],
      });
    });

    test("keeps captions only when present", () => {
      const result = classifyPost(
        post({
          is_gallery: true,
          gallery_data: {
            items: [
              { media_id: "a", id: 1, caption: "First" },
              { media_id: "b", id: 2, caption: "" },
            ],
          },
          media_metadata: {
            a: media("a", { u: "https://i.redd.it/a.jpg" }),
            b: media("b", { u: "https://i.redd.it/b.jpg" }),
          },
        }),
      );

      expect(result).toStrictEqual({
        kind: "gallery",
        items: [
          { url: "https://i.redd.it/a.jpg", caption: "First" },
          { url: "https://i.redd.it/b.jpg" },
        ],
      });
    });

    test("skips deleted, invalid, missing and url-less items", () => {
      const result = classifyPost(
        post({
          is_gallery: true,
          gallery_data: {
            items: [
              { media_id: "ok", id: 1 },
              { media_id: "gone", id: 2, is_deleted: true },
              { media_id: "bad", id: 3 },
              { media_id: "missing", id: 4 },
              { media_id: "empty", id: 5 },
            ],
          },
          media_metadata: {
            ok: media("ok", { u: "https://i.redd.it/ok.jpg" }),
            gone: media("gone", { u: "https://i.redd.it/gone.jpg" }),
            bad: media("bad", { u: "https://i.redd.it/bad.jpg" }, "invalid"),
            empty: media("empty", {}),
          },
        }),
      );

      expect(result).toEqual({
        kind: "gallery",
        items: [{ url: "https://i.redd.it/ok.jpg" }],
      });
    });

    // Real animated items have `s: { x, y, gif, mp4 }` and no `u`
    test("uses the gif url for animated items without a still url", () => {
      const result = classifyPost(
        post({
          is_gallery: true,
          gallery_data: { items: [{ media_id: "a", id: 1 }] },
          media_metadata: {
            a: media(
              "a",
              {
                gif: "https://i.redd.it/a.gif",
                mp4: "https://preview.redd.it/a.gif?format=mp4&s=x",
              },
              "valid",
              "AnimatedImage",
            ),
          },
        }),
      );

      expect(result).toEqual({
        kind: "gallery",
        items: [{ url: "https://i.redd.it/a.gif" }],
      });
    });

    test("a gallery with no usable items falls back to a link", () => {
      const result = classifyPost(
        post({
          is_gallery: true,
          gallery_data: { items: [{ media_id: "a", id: 1 }] },
          media_metadata: { a: media("a", {}, "deleted") },
        }),
      );

      expect(result.kind).toBe("link");
    });
  });

  describe("removed", () => {
    test("removed_by_category marks a post removed", () => {
      expect(classifyPost(post({ removed_by_category: "moderator" }))).toEqual({
        kind: "removed",
      });
    });

    test.each(["[removed]", "[deleted]"])("selftext %s is removed", (text) => {
      expect(classifyPost(post({ is_self: true, selftext: text }))).toEqual({
        kind: "removed",
      });
    });

    test("removal wins over media", () => {
      expect(
        classifyPost(
          post({
            removed_by_category: "reddit",
            post_hint: "image",
            is_video: true,
            secure_media: { reddit_video: video },
          }),
        ),
      ).toEqual({ kind: "removed" });
    });
  });

  describe("crosspost", () => {
    test("classifies the original's content", () => {
      const parent = post({
        id: "orig",
        post_hint: "image",
        url: "https://i.redd.it/orig.jpg",
      });
      const result = classifyPost(
        post({
          crosspost_parent_list: [parent],
          url: "/r/other/comments/orig",
        }),
      );

      expect(result).toEqual({
        kind: "crosspost",
        parent,
        content: { kind: "image", url: "https://i.redd.it/orig.jpg" },
      });
    });

    test("a removed original is reported inside the crosspost", () => {
      const parent = post({ removed_by_category: "moderator" });

      expect(classifyPost(post({ crosspost_parent_list: [parent] }))).toEqual({
        kind: "crosspost",
        parent,
        content: { kind: "removed" },
      });
    });

    test("a removed crosspost is just removed", () => {
      expect(
        classifyPost(
          post({
            removed_by_category: "author",
            crosspost_parent_list: [post({ is_self: true, selftext: "hi" })],
          }),
        ),
      ).toEqual({ kind: "removed" });
    });

    test("does not follow crossposts of crossposts", () => {
      const grandparent = post({ is_self: true, selftext: "deep" });
      const parent = post({
        is_self: true,
        selftext: "shallow",
        crosspost_parent_list: [grandparent],
      });

      expect(
        classifyPost(post({ crosspost_parent_list: [parent] })),
      ).toMatchObject({ kind: "crosspost", content: { kind: "text" } });
    });
  });
});
