import { describe, expect, test } from "bun:test";
import {
  actionRow,
  container,
  linkButton,
  mediaGallery,
  section,
  separator,
  textDisplay,
  thumbnail,
} from "@/embed/components";
import { buttonUrls, textContents, thumbnailUrls } from "@/embed/walk";

const embed = {
  component: container([
    textDisplay("top"),
    section(["one", "two"], thumbnail("https://example.com/t.png")),
    section(["three"], linkButton("Open", "https://example.com/section")),
    mediaGallery([{ url: "https://example.com/g.png" }]),
    separator(),
    actionRow([
      linkButton("A", "https://example.com/a"),
      linkButton("B", "https://example.com/b"),
    ]),
  ]),
};

describe("embed walkers", () => {
  test("textContents includes section text, in order", () => {
    expect(textContents(embed)).toEqual(["top", "one", "two", "three"]);
  });

  test("thumbnailUrls only reads thumbnail accessories", () => {
    expect(thumbnailUrls(embed)).toEqual(["https://example.com/t.png"]);
  });

  test("buttonUrls reads section accessories and action rows", () => {
    expect(buttonUrls(embed)).toEqual([
      "https://example.com/section",
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });
});
