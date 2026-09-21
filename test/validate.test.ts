import { describe, expect, test } from "bun:test";
import {
  actionRow,
  container,
  linkButton,
  MAX_GALLERY_ITEMS,
  MAX_THUMBNAILS,
  MAX_TOTAL_COMPONENTS,
  mediaGallery,
  section,
  textDisplay,
  thumbnail,
} from "@/embed/components";
import {
  assertValidEmbed,
  countComponents,
  countGalleryItems,
  countThumbnails,
  EmbedValidationError,
} from "@/embed/validate";

const images = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    url: `https://example.com/${i}.png`,
  }));

const withThumbnail = (i: number) =>
  section([`caption ${i}`], thumbnail(`https://example.com/t${i}.png`));

const embedWith = (
  opts: { galleries?: number[]; thumbnails?: number } = {},
) => ({
  component: container([
    textDisplay("hi"),
    ...(opts.galleries ?? []).map((count) => mediaGallery(images(count))),
    ...Array.from({ length: opts.thumbnails ?? 0 }, (_, i) => withThumbnail(i)),
  ]),
});

describe("assertValidEmbed", () => {
  test("counts gallery items across every gallery", () => {
    expect(countGalleryItems(embedWith({ galleries: [3, 4] }))).toBe(7);
    expect(countGalleryItems(embedWith())).toBe(0);
  });

  test("counts thumbnails only from section accessories", () => {
    expect(countThumbnails(embedWith({ thumbnails: 3 }))).toBe(3);
    expect(countThumbnails(embedWith({ galleries: [5] }))).toBe(0);
  });

  test("accepts up to the gallery limit in total, split across galleries", () => {
    expect(() =>
      assertValidEmbed(embedWith({ galleries: [MAX_GALLERY_ITEMS] })),
    ).not.toThrow();
    expect(() =>
      assertValidEmbed(embedWith({ galleries: [6, 4] })),
    ).not.toThrow();
  });

  test("rejects more gallery items than the limit even when each gallery is valid", () => {
    expect(() => assertValidEmbed(embedWith({ galleries: [6, 6] }))).toThrow(
      EmbedValidationError,
    );
    expect(() => assertValidEmbed(embedWith({ galleries: [10, 1] }))).toThrow(
      EmbedValidationError,
    );
  });

  test("rejects more thumbnails than the limit", () => {
    expect(() =>
      assertValidEmbed(embedWith({ thumbnails: MAX_THUMBNAILS })),
    ).not.toThrow();
    expect(() =>
      assertValidEmbed(embedWith({ thumbnails: MAX_THUMBNAILS + 1 })),
    ).toThrow(EmbedValidationError);
  });

  test("gallery items and thumbnails are limited separately", () => {
    expect(() =>
      assertValidEmbed(
        embedWith({
          galleries: [MAX_GALLERY_ITEMS],
          thumbnails: MAX_THUMBNAILS,
        }),
      ),
    ).not.toThrow();
  });

  test("counts every component, including the container and nested ones", () => {
    // container 1 + text 1 + gallery 1 + section (1 + 1 text + 1 accessory) + row (1 + 2 buttons)
    const embed = {
      component: container([
        textDisplay("hi"),
        mediaGallery(images(3)),
        withThumbnail(0),
        actionRow([
          linkButton("a", "https://example.com/a"),
          linkButton("b", "https://example.com/b"),
        ]),
      ]),
    };

    expect(countComponents(embed)).toBe(1 + 1 + 1 + 3 + 3);
  });

  test("rejects more than the total component limit", () => {
    // container 1 + text 1 + ten sections 30 = 32, so 8 single-item galleries reach 40
    const build = (galleries: number) =>
      embedWith({
        thumbnails: 10,
        galleries: Array.from({ length: galleries }, () => 1),
      });

    expect(countComponents(build(8))).toBe(MAX_TOTAL_COMPONENTS);
    expect(() => assertValidEmbed(build(8))).not.toThrow();
    expect(countComponents(build(9))).toBe(MAX_TOTAL_COMPONENTS + 1);
    expect(() => assertValidEmbed(build(9))).toThrow(EmbedValidationError);
  });

  test("packing items into one gallery avoids the component limit", () => {
    // Ten thumbnails and ten gallery items fit when the items share a gallery
    expect(() =>
      assertValidEmbed(embedWith({ thumbnails: 10, galleries: [10] })),
    ).not.toThrow();
  });

  // One text display adds 65 bytes of JSON around its text, so 2935 characters is
  // exactly 3000 bytes. Every extra display adds its own structure, so the same
  // text split in two no longer fits.
  test("rejects a payload over the size limit, however the text is split", () => {
    const one = (chars: number) => ({
      component: container([textDisplay("a".repeat(chars))]),
    });
    const two = (chars: number) => ({
      component: container([
        textDisplay("a".repeat(chars)),
        textDisplay("a".repeat(chars)),
      ]),
    });

    expect(() => assertValidEmbed(one(2935))).not.toThrow();
    expect(() => assertValidEmbed(one(2936))).toThrow(EmbedValidationError);
    expect(() => assertValidEmbed(two(1455))).not.toThrow();
    expect(() => assertValidEmbed(two(1456))).toThrow(EmbedValidationError);
  });

  // The limit counts bytes, not characters, and escapes count in full
  test("counts multi-byte characters by their bytes and escapes in full", () => {
    // 1466 "é" + "END" is 1469 characters and 3000 bytes, one more "é" is 3002
    const accentsAtLimit = {
      component: container([textDisplay(`${"é".repeat(1466)}END`)]),
    };
    const accents = {
      component: container([textDisplay(`${"é".repeat(1467)}END`)]),
    };
    // 1000 "<" is 1000 characters but 6000 bytes once escaped for the script tag
    const brackets = { component: container([textDisplay("<".repeat(1000))]) };

    expect(() => assertValidEmbed(accentsAtLimit)).not.toThrow();
    expect(() => assertValidEmbed(accents)).toThrow(EmbedValidationError);
    expect(() => assertValidEmbed(brackets)).toThrow(EmbedValidationError);
  });

  test("rejects an empty text display, at the top level or inside a section", () => {
    const topLevel = { component: container([textDisplay("")]) };
    const inSection = {
      component: container([
        section(["ok", ""], thumbnail("https://example.com/t.png")),
      ]),
    };

    expect(() => assertValidEmbed(topLevel)).toThrow(EmbedValidationError);
    expect(() => assertValidEmbed(inSection)).toThrow(EmbedValidationError);
  });

  test("rejects a text display with only whitespace", () => {
    const whitespace = { component: container([textDisplay("   \n\t  ")]) };
    expect(() => assertValidEmbed(whitespace)).toThrow(EmbedValidationError);
  });

  test("matches what Discord reported: 10 sections and 10 galleries is 41 and rejected", () => {
    const sections = Array.from({ length: 10 }, (_, i) => withThumbnail(i));
    const galleries = (count: number) =>
      Array.from({ length: count }, () => mediaGallery(images(1)));

    const tooMany = { component: container([...sections, ...galleries(10)]) };
    const oneFewer = { component: container([...sections, ...galleries(9)]) };

    expect(countComponents(tooMany)).toBe(41);
    expect(() => assertValidEmbed(tooMany)).toThrow(EmbedValidationError);
    expect(countComponents(oneFewer)).toBe(40);
    expect(() => assertValidEmbed(oneFewer)).not.toThrow();
  });
});
