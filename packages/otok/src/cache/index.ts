import type { CacheConfig, CacheEntry, CacheKeyInput, CacheLookupResult, CacheProvider } from "./types.js";
import { isFresh, isStale, lookupEntry } from "./lookup.js";

export { isFresh, isStale, lookupEntry } from "./lookup.js";
export {
  createRedisRestClient,
  EdgeKvCacheProvider,
  RedisCacheProvider,
  type EdgeKvCacheProviderOptions,
  type EdgeKvNamespace,
  type RedisCacheProviderOptions,
  type RedisClient,
} from "./providers.js";

export function buildCacheKey(input: CacheKeyInput): string {
  const parts = [
    input.method.toUpperCase(),
    input.pathname,
    input.private ? "private" : "public",
    input.locale ?? "-",
    input.tenant ?? "-",
  ];

  const paramKeys = Object.keys(input.params).sort();
  for (const key of paramKeys) parts.push(`${key}=${input.params[key]}`);

  if (input.varyHeaders) {
    for (const [key, value] of Object.entries(input.varyHeaders).sort(([a], [b]) => a.localeCompare(b))) {
      if (value !== undefined) parts.push(`${key}:${value}`);
    }
  }

  return parts.join("|");
}

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

export class MemoryCacheProvider implements CacheProvider {
  readonly name = "memory";
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<CacheLookupResult | undefined> {
    return lookupEntry(this.store.get(key));
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.store.set(key, entry);
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

export type { CacheConfig, CacheEntry, CacheKeyInput, CacheLookupResult, CacheProvider, RevalidationResult } from "./types.js";
