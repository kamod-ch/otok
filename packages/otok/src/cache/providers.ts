import type { CacheProvider } from "./types.js";
import { MemoryCacheProvider } from "./index.js";

/** Redis-backed cache provider contract. Implement in app code or a future `@otok/cache-redis` package. */
export interface RedisCacheProviderOptions {
  url: string;
  keyPrefix?: string;
}

export class RedisCacheProvider implements CacheProvider {
  readonly name = "redis";

  constructor(private readonly options: RedisCacheProviderOptions) {}

  async get(_key: string): Promise<undefined> {
    throw new Error("[otok:cache] RedisCacheProvider is a contract stub. Connect a Redis client in your deployment adapter.");
  }

  async set(_key: string, _entry: import("./types.js").CacheEntry): Promise<void> {
    throw new Error("[otok:cache] RedisCacheProvider is a contract stub. Connect a Redis client in your deployment adapter.");
  }

  async delete(_key: string): Promise<boolean> {
    return false;
  }

  async deleteByTag(_tag: string): Promise<number> {
    return 0;
  }

  async deleteByPath(_path: string): Promise<number> {
    return 0;
  }
}

/** Edge KV cache provider contract for Cloudflare Workers and similar runtimes. */
export interface EdgeKvCacheProviderOptions {
  namespace: unknown;
  keyPrefix?: string;
}

export class EdgeKvCacheProvider implements CacheProvider {
  readonly name = "edge-kv";

  constructor(private readonly options: EdgeKvCacheProviderOptions) {}

  async get(_key: string): Promise<undefined> {
    throw new Error("[otok:cache] EdgeKvCacheProvider is a contract stub. Pass a KV namespace binding from your worker adapter.");
  }

  async set(_key: string, _entry: import("./types.js").CacheEntry): Promise<void> {
    throw new Error("[otok:cache] EdgeKvCacheProvider is a contract stub. Pass a KV namespace binding from your worker adapter.");
  }

  async delete(_key: string): Promise<boolean> {
    return false;
  }

  async deleteByTag(_tag: string): Promise<number> {
    return 0;
  }

  async deleteByPath(_path: string): Promise<number> {
    return 0;
  }
}

export { MemoryCacheProvider };
