import { describe, expect, test } from "bun:test";
import { MAX_GALLERY_ITEMS, mediaGallery } from "@/embed/components";

const urls = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    url: `https://example.com/${i}.png`,
  }));

describe("mediaGallery", () => {
  test("keeps galleries within the limit as they are", () => {
    expect(mediaGallery(urls(1)).items).toHaveLength(1);
    expect(mediaGallery(urls(MAX_GALLERY_ITEMS)).items).toHaveLength(
      MAX_GALLERY_ITEMS,
    );
  });

  test("drops items past the limit, keeping the first ones", () => {
    const gallery = mediaGallery(urls(MAX_GALLERY_ITEMS + 5));

    expect(gallery.items).toHaveLength(MAX_GALLERY_ITEMS);
    expect(gallery.items[0]?.media.url).toBe("https://example.com/0.png");
    expect(gallery.items.at(-1)?.media.url).toBe(
      `https://example.com/${MAX_GALLERY_ITEMS - 1}.png`,
    );
  });

  test("refuses to build an empty gallery", () => {
    expect(() => mediaGallery([])).toThrow(RangeError);
  });

  test("only includes optional fields that were provided", () => {
    const [item] = mediaGallery([
      { url: "https://example.com/a.png", description: "alt", spoiler: true },
    ]).items;

    expect(item).toEqual({
      media: { url: "https://example.com/a.png" },
      description: "alt",
      spoiler: true,
    });
    expect(mediaGallery(urls(1)).items[0]).toEqual({
      media: { url: "https://example.com/0.png" },
    });
  });
});
