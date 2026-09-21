import { describe, expect, test } from "bun:test";
import { container, MAX_EMBED_SIZE, textDisplay } from "@/embed/components";
import { buildFittingEmbed } from "@/embed/fit";
import { embedSize } from "@/embed/serialize";
import { textContents } from "@/embed/walk";

const build = (text: string) => ({
  component: container([
    textDisplay("header"),
    ...(text ? [textDisplay(text)] : []),
  ]),
});

// The text that ended up in the embed (everything after the header)
const bodyOf = (embed: ReturnType<typeof build>) =>
  textContents(embed).slice(1).join("");

const LONE_SURROGATE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

describe("buildFittingEmbed", () => {
  test("leaves text that already fits untouched", () => {
    const embed = buildFittingEmbed("short text", build);

    expect(bodyOf(embed)).toBe("short text");
  });

  test("cuts long text to the longest prefix that fits, ending in an ellipsis", () => {
    const text = "word ".repeat(2000);
    const embed = buildFittingEmbed(text, build);
    const body = bodyOf(embed);

    expect(embedSize(embed)).toBeLessThanOrEqual(MAX_EMBED_SIZE);
    expect(body.endsWith("…")).toBe(true);
    // One more character of the original would no longer fit
    expect(embedSize(build(`${body}w`))).toBeGreaterThan(MAX_EMBED_SIZE);
  });

  test("counts escapes when fitting", () => {
    // Every quote and newline takes two characters of JSON, `<` takes six
    for (const char of ['"', "\n", "<"]) {
      const embed = buildFittingEmbed(char.repeat(5000), build);

      expect(embedSize(embed)).toBeLessThanOrEqual(MAX_EMBED_SIZE);
      expect(bodyOf(embed).endsWith("…")).toBe(true);
    }
  });

  test("drops trailing whitespace before the ellipsis", () => {
    const body = bodyOf(buildFittingEmbed("a  \n ".repeat(3000), build));

    expect(body).not.toMatch(/\s…$/);
  });

  test("never cuts an emoji in half", () => {
    // 4 bytes and two UTF-16 units each; try every cut position parity
    for (const prefix of ["", "x"]) {
      const embed = buildFittingEmbed(`${prefix}${"😀".repeat(2000)}`, build);

      expect(bodyOf(embed)).not.toMatch(LONE_SURROGATE);
      expect(embedSize(embed)).toBeLessThanOrEqual(MAX_EMBED_SIZE);
    }
  });

  test("passes an empty string when nothing fits", () => {
    const seen: string[] = [];
    const bloated = (text: string) => {
      seen.push(text);
      return {
        component: container([
          textDisplay("h".repeat(MAX_EMBED_SIZE)),
          ...(text ? [textDisplay(text)] : []),
        ]),
      };
    };

    const embed = buildFittingEmbed("some text", bloated);

    expect(textContents(embed)).toHaveLength(1);
    expect(seen.at(-1)).toBe("");
  });
});
