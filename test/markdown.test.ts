import { describe, expect, test } from "bun:test";
import { fixMaskedLinks } from "@/embed/markdown";

describe("fixMaskedLinks", () => {
  test("drops the scheme from a label that repeats the url", () => {
    expect(fixMaskedLinks("[https://example.com](https://example.com)")).toBe(
      "[example.com](https://example.com)",
    );
  });

  test("handles a scheme anywhere in the label, in any case", () => {
    expect(fixMaskedLinks("[see https://a.com/x now](https://a.com/x)")).toBe(
      "[see a.com/x now](https://a.com/x)",
    );
    expect(fixMaskedLinks("[HTTP://a.com](http://a.com)")).toBe(
      "[a.com](http://a.com)",
    );
  });

  test("falls back to the url when the label is only a scheme", () => {
    expect(fixMaskedLinks("[https://](https://a.com)")).toBe(
      "[a.com](https://a.com)",
    );
  });

  test("leaves the url, including parentheses, untouched", () => {
    const wiki = "https://en.wikipedia.org/wiki/Foo_(bar)";

    expect(fixMaskedLinks(`[${wiki}](${wiki})`)).toBe(
      `[en.wikipedia.org/wiki/Foo_(bar)](${wiki})`,
    );
  });

  test("only changes the links that need it", () => {
    const text =
      "Try [Fossil Heists](https://www.youtube.com/watch?v=x) or [https://a.com](https://a.com) and https://b.com";

    expect(fixMaskedLinks(text)).toBe(
      "Try [Fossil Heists](https://www.youtube.com/watch?v=x) or [a.com](https://a.com) and https://b.com",
    );
  });

  test("leaves text without masked links alone", () => {
    const text =
      "## Heading\n**bold** and *italic* with https://a.com and [x] (y)";

    expect(fixMaskedLinks(text)).toBe(text);
  });

  test("is idempotent", () => {
    const once = fixMaskedLinks("[https://a.com](https://a.com)");

    expect(fixMaskedLinks(once)).toBe(once);
  });
});
