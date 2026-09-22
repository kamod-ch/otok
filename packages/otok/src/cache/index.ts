import type { CacheConfig, CacheEntry, CacheLookupResult, CacheProvider } from "./types.js";
import { lookupEntry } from "./lookup.js";
export { isFresh, isStale, lookupEntry } from "./lookup.js";
export {
  buildCacheKey,
  buildCacheKeyFromContext,
  allowsServerHtmlCache,
  encodeQueryEntries,
  resolveRequestVaryHeaders,
  CACHE_KEY_VERSION,
} from "./key.js";
export {
  getOtokCacheScope,
  resolveOtokCacheScope,
  setOtokCacheScope,
  OTOK_CACHE_SCOPE,
  type OtokCacheScope,
} from "./scope.js";
export { isPersonalizedRequest } from "./personalization.js";
export type {
  CacheConfig,
  CacheEntry,
  CacheKeyInput,
  CacheLookupResult,
  CacheProvider,
  RevalidationResult,
} from "./types.js";
export {
  createRedisRestClient,
  EdgeKvCacheProvider,
  RedisCacheProvider,
  type EdgeKvCacheProviderOptions,
  type EdgeKvNamespace,
  type RedisCacheProviderOptions,
  type RedisClient,
} from "./providers.js";

export function buildCacheControlHeader(config: CacheConfig): string {
  if (config.noStore) return "no-store";

  const directives: string[] = [];

  if (config.private || config.public === false) directives.push("private");
  else if (config.public) directives.push("public");

  if (config.maxAge !== undefined) directives.push(`max-age=${Math.max(0, Math.floor(config.maxAge))}`);
  if (config.sMaxAge !== undefined) directives.push(`s-maxage=${Math.max(0, Math.floor(config.sMaxAge))}`);
  if (config.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${Math.max(0, Math.floor(config.staleWhileRevalidate))}`);
  }

  if (directives.length === 0) return "private, no-cache";
  return directives.join(", ");
}

export function buildCacheTagHeader(tags: string[] | undefined): string | undefined {
  if (!tags || tags.length === 0) return undefined;
  return tags.join(",");
}

export function buildVaryHeader(config: CacheConfig, extra: string[] = []): string | undefined {
  const values = [...new Set([...(config.vary ?? []), ...extra])];
  return values.length > 0 ? values.join(", ") : undefined;
}

const inflight = new Map<string, Promise<unknown>>();

/** Prevent cache stampedes by deduplicating concurrent miss fetches. */
export async function withCacheStampedeProtection<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = factory().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export interface MemoryCacheProviderOptions {
  /** Maximum number of entries retained after pruning expired keys. */
  maxEntries?: number;
  now?: () => number;
}

export class MemoryCacheProvider implements CacheProvider {
  readonly name = "memory";
  private store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: MemoryCacheProviderOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? 512);
    this.now = options.now ?? (() => Date.now());
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.store) {
      if (lookupEntry(entry, now).hit === "miss") this.store.delete(key);
    }
  }

  private evictOverflow(): void {
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  async get(key: string): Promise<CacheLookupResult | undefined> {
    const entry = this.store.get(key);
    const lookup = lookupEntry(entry, this.now());
    if (entry && lookup.hit === "miss") this.store.delete(key);
    return lookup;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.pruneExpired();
    this.store.set(key, entry);
    this.evictOverflow();
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async deleteByTag(tag: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.store) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async deleteByPath(path: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.store) {
      if (entry.path === path) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }
}

let defaultProvider: CacheProvider = new MemoryCacheProvider();

export function getCacheProvider(): CacheProvider {
  return defaultProvider;
}

export function setCacheProvider(provider: CacheProvider): void {
  defaultProvider = provider;
}

export async function revalidateTag(tag: string, provider = getCacheProvider()): Promise<number> {
  return provider.deleteByTag(tag);
}

export async function revalidatePath(path: string, provider = getCacheProvider()): Promise<number> {
  return provider.deleteByPath(path);
}
