import { describe, expect, test } from "bun:test";
import { buildSubredditEmbed } from "@/embed/builders/subreddit";
import { REDDIT_ORANGE } from "@/embed/color";
import { assertValidEmbed } from "@/embed/validate";
import { buttonUrls, textContents, thumbnailUrls } from "@/embed/walk";
import type { RedditSubredditData } from "@/types/reddit";

const subredditFixture = (overrides: Partial<RedditSubredditData> = {}) =>
  ({
    title: "Example Community",
    public_description: "A place to talk about examples",
    subscribers: 12_500,
    community_icon: "https://example.com/community.png",
    icon_img: "https://example.com/icon.png",
    url: "/r/example/",
    primary_color: "#0079d3",
    created_utc: 1_618_935_600.0,
    display_name_prefixed: "r/example",
    ...overrides,
  }) as RedditSubredditData;

const build = (overrides?: Partial<RedditSubredditData>) =>
  buildSubredditEmbed(subredditFixture(overrides));

describe("buildSubredditEmbed", () => {
  test("shows the title, description, subscriber count, name and creation date", () => {
    const text = textContents(build()).join("\n");

    expect(text).toContain("Example Community");
    expect(text).toContain("A place to talk about examples");
    expect(text).toContain("12.5K subscribers");
    expect(text).toContain("r/example");
    expect(text).toContain("<t:1618935600:d>");
  });

  test("links to the subreddit on Reddit", () => {
    expect(buttonUrls(build())).toContain("https://reddit.com/r/example/");
  });

  test("uses the subreddit's own color as the accent", () => {
    expect(build({ primary_color: "#0079d3" }).component.accent_color).toBe(
      0x0079d3,
    );
  });

  test("falls back to Reddit orange when the color is unset", () => {
    expect(build({ primary_color: "" }).component.accent_color).toBe(
      REDDIT_ORANGE,
    );
  });

  test("uses the community icon as the thumbnail", () => {
    expect(thumbnailUrls(build())).toEqual([
      "https://example.com/community.png",
    ]);
  });

  test("falls back to icon_img when there is no community icon", () => {
    expect(thumbnailUrls(build({ community_icon: "" }))).toEqual([
      "https://example.com/icon.png",
    ]);
  });

  test("still shows the details when there is no icon at all", () => {
    const embed = build({ community_icon: "", icon_img: "" });
    const text = textContents(embed).join("\n");

    expect(thumbnailUrls(embed)).toEqual([]);
    expect(text).toContain("Example Community");
    expect(text).toContain("A place to talk about examples");
    expect(text).toContain("12.5K subscribers");
  });

  // The validator rejects empty text displays, so a valid embed is one that
  // left the empty description out
  test.each([
    ["all fields set", {}],
    ["no community icon", { community_icon: "" }],
    ["no icon at all", { community_icon: "", icon_img: "" }],
    ["an empty description", { public_description: "" }],
    ["an unset color", { primary_color: "" }],
    [
      "everything unset",
      {
        community_icon: "",
        icon_img: "",
        public_description: "",
        primary_color: "",
      },
    ],
  ] satisfies [string, Partial<RedditSubredditData>][])(
    "produces a valid embed with %s",
    (_name, overrides) => {
      const embed = build(overrides);

      expect(() => assertValidEmbed(embed)).not.toThrow();
      expect(textContents(embed).join("\n")).toContain("Example Community");
    },
  );
});
