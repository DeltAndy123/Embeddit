import { describe, expect, test } from "bun:test";
import { ComponentType } from "discord-api-types/v10";
import { buildSubredditEmbed } from "@/embed/builders/subreddit";
import { REDDIT_ORANGE } from "@/embed/color";
import { assertValidEmbed } from "@/embed/validate";
import type { RedditSubredditData } from "@/types/reddit";

const subredditFixture = (overrides: Partial<RedditSubredditData> = {}) =>
  ({
    title: "Example Community",
    public_description: "A place to talk about examples",
    subscribers: 12_500,
    community_icon: "https://example.com/community.png",
    icon_img: "https://example.com/icon.png",
    url: "/r/example/",
    key_color: "#0079d3",
    created_utc: 1_618_935_600.0,
    display_name_prefixed: "r/example",
    ...overrides,
  }) as RedditSubredditData;

const childrenOf = (overrides?: Partial<RedditSubredditData>) =>
  buildSubredditEmbed(subredditFixture(overrides)).component.components;

describe("buildSubredditEmbed", () => {
  test("builds a section, a link to Reddit, a divider and a footer", () => {
    const [main, actions, separator, footer] = childrenOf();

    expect(main).toMatchObject({
      type: ComponentType.Section,
      components: [
        { content: "## Example Community" },
        { content: "A place to talk about examples" },
        { content: "**👥 12.5K subscribers**" },
      ],
      accessory: {
        type: ComponentType.Thumbnail,
        media: { url: "https://example.com/community.png" },
      },
    });
    expect(actions).toMatchObject({
      type: ComponentType.ActionRow,
      components: [
        { label: "View on Reddit", url: "https://reddit.com/r/example/" },
      ],
    });
    expect(separator).toMatchObject({
      type: ComponentType.Separator,
      divider: true,
    });
    expect(footer).toMatchObject({
      content: "-# r/example  •  Created at <t:1618935600:d>",
    });
  });

  test("produces an embed that passes validation", () => {
    expect(() =>
      assertValidEmbed(buildSubredditEmbed(subredditFixture())),
    ).not.toThrow();
  });

  test("uses the subreddit's own color as the accent", () => {
    const embed = buildSubredditEmbed(
      subredditFixture({ key_color: "#0079d3" }),
    );
    expect(embed.component.accent_color).toBe(0x0079d3);
  });

  test("falls back to Reddit orange when the color is unset", () => {
    const embed = buildSubredditEmbed(subredditFixture({ key_color: "" }));
    expect(embed.component.accent_color).toBe(REDDIT_ORANGE);
  });

  test("falls back to icon_img when there is no community icon", () => {
    const [main] = childrenOf({ community_icon: "" });
    expect(main).toMatchObject({
      accessory: { media: { url: "https://example.com/icon.png" } },
    });
  });

  test("uses a plain text display when there is no icon at all", () => {
    const [main] = childrenOf({ community_icon: "", icon_img: "" });

    expect(main).toMatchObject({ type: ComponentType.TextDisplay });
    expect(main).not.toHaveProperty("accessory");
    expect(main).toMatchObject({
      content:
        "## Example Community\nA place to talk about examples\n**👥 12.5K subscribers**",
    });
  });

  test("leaves out an empty description", () => {
    const [main] = childrenOf({ public_description: "" });
    expect(main).toMatchObject({
      components: [
        { content: "## Example Community" },
        { content: "**👥 12.5K subscribers**" },
      ],
    });
  });
});
