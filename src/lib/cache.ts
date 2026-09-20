export interface TtlCacheOptions {
  maxEntries: number;
  now?: () => number;
}

export interface GetOrSetOptions {
  ttlMs: number;
  /** Return a TTL to cache this error (negative caching), or undefined to not cache it. */
  errorTtlMs?: (error: unknown) => number | undefined;
}

export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type Entry<V> = { expiresAt: number } & (
  | { value: DeepReadonly<V> }
  | { error: unknown }
);

/**
 * In-memory LRU cache with per-call TTLs that shares in-flight loads.
 * Cached values are shared between callers, so they are returned as DeepReadonly
 * (compile-time only; nothing is frozen at runtime).
 */
export class TtlCache<K, V> {
  readonly #entries = new Map<K, Entry<V>>();
  readonly #pending = new Map<K, Promise<DeepReadonly<V>>>();
  readonly #maxEntries: number;
  readonly #now: () => number;

  constructor(opts: TtlCacheOptions) {
    this.#maxEntries = opts.maxEntries;
    this.#now = opts.now ?? Date.now;
  }

  get size(): number {
    return this.#entries.size;
  }


  /**
   * Returns the cached value for a key, or loads and caches it when absent
   *
   * @param key The cache key
   * @param loader The async function used to load the value on a cache miss
   * @param opts TTL and optional negative-caching configuration for this call
   * @returns A promise for the cached or loaded value
   */
  getOrSet(
    key: K,
    loader: () => Promise<V>,
    opts: GetOrSetOptions,
  ): Promise<DeepReadonly<V>> {
    const entry = this.#read(key);
    if (entry) {
      // Cache hit
      return "error" in entry
        ? Promise.reject(entry.error)
        : Promise.resolve(entry.value);
    }

    // Cache miss
    const inFlight = this.#pending.get(key);
    if (inFlight) return inFlight;

    const promise: Promise<DeepReadonly<V>> = (async () => loader())().then(
      (loaded) => {
        // The one place a mutable V becomes shared: callers only ever see it readonly
        const value = loaded as DeepReadonly<V>;
        this.#settle(key, promise, { value }, opts.ttlMs);
        return value;
      },
      (error) => {
        const errorTtl = opts.errorTtlMs?.(error);
        this.#settle(key, promise, { error }, errorTtl);
        throw error;
      },
    );
    this.#pending.set(key, promise);
    return promise;
  }

  delete(key: K): void {
    this.#entries.delete(key);
    // An in-flight load for a deleted key must not repopulate the cache
    this.#pending.delete(key);
  }

  clear(): void {
    this.#entries.clear();
    this.#pending.clear();
  }

  #read(key: K): Entry<V> | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (this.#now() >= entry.expiresAt) {
      this.#entries.delete(key);
      return undefined;
    }
    // Re-insert so the most recently used entries sit at the end
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry;
  }

  #settle(
    key: K,
    promise: Promise<DeepReadonly<V>>,
    result: { value: DeepReadonly<V> } | { error: unknown },
    ttlMs: number | undefined,
  ): void {
    if (this.#pending.get(key) !== promise) return;
    this.#pending.delete(key);
    if (!ttlMs || ttlMs <= 0) return;

    this.#entries.set(key, { ...result, expiresAt: this.#now() + ttlMs });
    while (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done) break;
      this.#entries.delete(oldest.value);
    }
  }
}
