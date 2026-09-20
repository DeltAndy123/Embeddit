import { describe, expect, test } from "bun:test";
import { REDDIT_ORANGE } from "@/embed/color";
import {
  accentColorOrDefault,
  footerLine,
  redditUrl,
  viewOnRedditButton,
} from "@/embed/parts";

describe("embed parts", () => {
  test("redditUrl prefixes a Reddit path", () => {
    expect(redditUrl("/r/example/")).toBe("https://reddit.com/r/example/");
  });

  test("viewOnRedditButton links to the given path", () => {
    expect(viewOnRedditButton("/r/example/")).toMatchObject({
      label: "View on Reddit",
      url: "https://reddit.com/r/example/",
    });
  });

  test("accentColorOrDefault converts valid colors and falls back otherwise", () => {
    expect(accentColorOrDefault("#ff4500")).toBe(0xff4500);
    expect(accentColorOrDefault("")).toBe(REDDIT_ORANGE);
    expect(accentColorOrDefault("nope")).toBe(REDDIT_ORANGE);
  });

  test("footerLine joins its parts with a bullet", () => {
    expect(footerLine("r/example", "Created")).toMatchObject({
      content: "-# r/example  •  Created",
    });
  });
});
