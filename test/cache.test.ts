import { describe, expect, test } from "bun:test";
import { TtlCache } from "@/lib/cache";

const setup = (maxEntries = 10) => {
  let time = 0;
  const cache = new TtlCache<string, string>({ maxEntries, now: () => time });
  let calls = 0;
  const loader = (value: string) => async () => {
    calls++;
    return value;
  };
  return {
    cache,
    loader,
    calls: () => calls,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe("TtlCache", () => {
  test("shares one load between concurrent callers", async () => {
    const { cache, calls } = setup();
    let loads = 0;
    const load = async () => {
      loads++;
      await Bun.sleep(10);
      return "v";
    };

    const values = await Promise.all([
      cache.getOrSet("key", load, { ttlMs: 1000 }),
      cache.getOrSet("key", load, { ttlMs: 1000 }),
      cache.getOrSet("key", load, { ttlMs: 1000 }),
    ]);

    expect(values).toEqual(["v", "v", "v"]);
    expect(loads).toBe(1);
    expect(calls()).toBe(0);
  });

  test("serves from cache until the ttl passes, then reloads", async () => {
    const { cache, loader, calls, advance } = setup();

    expect(await cache.getOrSet("key", loader("a"), { ttlMs: 1000 })).toBe("a");
    advance(999);
    expect(await cache.getOrSet("key", loader("b"), { ttlMs: 1000 })).toBe("a");
    advance(1);
    expect(await cache.getOrSet("key", loader("b"), { ttlMs: 1000 })).toBe("b");
    expect(calls()).toBe(2);
  });

  test("evicts the least recently used entry when full", async () => {
    const { cache, loader, calls } = setup(2);

    await cache.getOrSet("a", loader("a"), { ttlMs: 1000 });
    await cache.getOrSet("b", loader("b"), { ttlMs: 1000 });
    await cache.getOrSet("a", loader("a"), { ttlMs: 1000 }); // touch a
    await cache.getOrSet("c", loader("c"), { ttlMs: 1000 }); // evicts b

    expect(cache.size).toBe(2);
    expect(calls()).toBe(3);
    await cache.getOrSet("a", loader("a"), { ttlMs: 1000 });
    expect(calls()).toBe(3);
    await cache.getOrSet("b", loader("b"), { ttlMs: 1000 });
    expect(calls()).toBe(4);
  });

  test("does not cache failures by default", async () => {
    const { cache } = setup();
    let attempts = 0;
    const flaky = async () => {
      if (++attempts === 1) throw new Error("boom");
      return "ok";
    };

    expect(cache.getOrSet("key", flaky, { ttlMs: 1000 })).rejects.toThrow(
      "boom",
    );
    expect(await cache.getOrSet("key", flaky, { ttlMs: 1000 })).toBe("ok");
    expect(attempts).toBe(2);
  });

  test("caches errors for a short time when errorTtlMs is given", async () => {
    const { cache, advance } = setup();
    let attempts = 0;
    const missing = async (): Promise<string> => {
      attempts++;
      throw new Error("not found");
    };
    const opts = { ttlMs: 1000, errorTtlMs: () => 100 };

    expect(cache.getOrSet("key", missing, opts)).rejects.toThrow("not found");
    expect(cache.getOrSet("key", missing, opts)).rejects.toThrow("not found");
    expect(attempts).toBe(1);

    advance(100);
    expect(cache.getOrSet("key", missing, opts)).rejects.toThrow("not found");
    expect(attempts).toBe(2);
  });

  test("errors the callback declines to cache are not cached", async () => {
    const { cache } = setup();
    let attempts = 0;
    const failing = async (): Promise<string> => {
      attempts++;
      throw new Error("rate limited");
    };
    const opts = { ttlMs: 1000, errorTtlMs: () => undefined };

    expect(cache.getOrSet("key", failing, opts)).rejects.toThrow();
    expect(cache.getOrSet("key", failing, opts)).rejects.toThrow();
    expect(attempts).toBe(2);
  });

  test("a load in flight when the key is deleted does not repopulate the cache", async () => {
    const { cache, loader, calls } = setup();
    const slow = async () => {
      await Bun.sleep(10);
      return "stale";
    };

    const pending = cache.getOrSet("key", slow, { ttlMs: 1000 });
    cache.delete("key");
    expect(await pending).toBe("stale");

    expect(await cache.getOrSet("key", loader("fresh"), { ttlMs: 1000 })).toBe(
      "fresh",
    );
    expect(calls()).toBe(1);
  });

  test("a ttl of zero is never stored", async () => {
    const { cache, loader, calls } = setup();
    await cache.getOrSet("key", loader("a"), { ttlMs: 0 });
    await cache.getOrSet("key", loader("a"), { ttlMs: 0 });
    expect(calls()).toBe(2);
    expect(cache.size).toBe(0);
  });
});
