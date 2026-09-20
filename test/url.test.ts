import { describe, expect, test } from "bun:test";
import {
  isRedditHost,
  parseRedditPermalink,
  stripTrackingParams,
} from "@/reddit/url";

describe("parseRedditPermalink", () => {
  test("parses posts with and without a slug", () => {
    expect(parseRedditPermalink("/r/geometrydash/comments/1nv7724/")).toEqual({
      postId: "1nv7724",
    });
    expect(
      parseRedditPermalink("/r/geometrydash/comments/1nv7724/some_title/"),
    ).toEqual({ postId: "1nv7724" });
  });

  test("parses comment permalinks", () => {
    expect(
      parseRedditPermalink("/r/sub/comments/1nv7724/some_title/ab12cd/"),
    ).toEqual({ postId: "1nv7724", commentId: "ab12cd" });
  });

  test("supports user profile posts and placeholder slugs", () => {
    expect(parseRedditPermalink("/user/spez/comments/abc123/x/")).toEqual({
      postId: "abc123",
    });
    expect(parseRedditPermalink("/r/sub/comments/abc123/_/def456")).toEqual({
      postId: "abc123",
      commentId: "def456",
    });
  });

  test("rejects anything else", () => {
    expect(parseRedditPermalink("/r/sub/")).toBeNull();
    expect(parseRedditPermalink("/r/sub/s/OFdMEx2bJH")).toBeNull();
    expect(parseRedditPermalink("/r/sub/comments/../etc/passwd")).toBeNull();
    expect(parseRedditPermalink("/r/sub/comments/abc123/a/b/c")).toBeNull();
  });
});

describe("isRedditHost", () => {
  test("only accepts reddit.com and its subdomains", () => {
    expect(isRedditHost("reddit.com")).toBe(true);
    expect(isRedditHost("www.reddit.com")).toBe(true);
    expect(isRedditHost("oauth.reddit.com")).toBe(true);
    expect(isRedditHost("evilreddit.com")).toBe(false);
    expect(isRedditHost("reddit.com.evil.com")).toBe(false);
  });
});

describe("stripTrackingParams", () => {
  test("removes share and utm params but keeps others", () => {
    const url = new URL(
      "https://www.reddit.com/r/a/comments/b/c/?share_id=x&utm_source=share&utm_name=ioscss&context=3",
    );
    expect(stripTrackingParams(url).toString()).toBe(
      "https://www.reddit.com/r/a/comments/b/c/?context=3",
    );
  });
});
