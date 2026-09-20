import { expect, test } from "bun:test";
import { TtlCache } from "@/lib/cache";

interface Post {
  title: string;
  preview: { images: { url: string }[] };
}

test("values returned from the cache are deeply readonly at compile time", async () => {
  const cache = new TtlCache<string, Post>({ maxEntries: 1 });
  const post = await cache.getOrSet(
    "k",
    async () => ({ title: "t", preview: { images: [{ url: "u" }] } }),
    { ttlMs: 1000 },
  );

  // Never called (these only need to fail to compile if the types regress)
  const mutations = () => {
    // @ts-expect-error top-level property is readonly
    post.title = "x";
    // @ts-expect-error nested property is readonly
    post.preview.images[0]!.url = "x";
    // @ts-expect-error arrays are readonly
    post.preview.images.push({ url: "x" });
  };

  expect(typeof mutations).toBe("function");
  expect(post.preview.images[0]?.url).toBe("u");
});
