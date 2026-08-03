import type { CacheEntry, CacheLookupResult, CacheProvider } from "./types.js";
import { lookupEntry } from "./lookup.js";

/** Minimal Redis surface — ioredis, node-redis, Upstash, or createRedisRestClient(). */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { px?: number }): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
}

export interface RedisCacheProviderOptions {
  /** Injected Redis client (preferred). */
  client: RedisClient;
  keyPrefix?: string;
}

/**
 * Upstash-compatible Redis REST client using global fetch (no ioredis dependency).
 */
export function createRedisRestClient(options: {
  url: string;
  token: string;
  fetch?: typeof fetch;
}): RedisClient {
  const fetchFn = options.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new Error("[otok:cache] createRedisRestClient requires fetch (Node 20+ or undici).");
  }

  async function cmd<T>(...args: unknown[]): Promise<T> {
    const response = await fetchFn(options.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      throw new Error(`[otok:cache] Redis REST request failed with ${response.status}`);
    }
    const json = (await response.json()) as { result: T };
    return json.result;
  }

  return {
    get: (key) => cmd<string | null>("GET", key),
    set: (key, value, opts) =>
      opts?.px ? cmd("SET", key, value, "PX", opts.px) : cmd("SET", key, value),
    del: (...keys) => cmd<number>("DEL", ...keys),
    sadd: (key, ...members) => cmd<number>("SADD", key, ...members),
    srem: (key, ...members) => cmd<number>("SREM", key, ...members),
    smembers: (key) => cmd<string[]>("SMEMBERS", key),
  };
}

function entryTtlMs(entry: CacheEntry): number | undefined {
  const seconds = entry.maxAge + entry.staleWhileRevalidate;
  return seconds > 0 ? seconds * 1000 : undefined;
}

export class RedisCacheProvider implements CacheProvider {
  readonly name = "redis";
  private readonly prefix: string;
  private readonly client: RedisClient;

  constructor(options: RedisCacheProviderOptions) {
    this.client = options.client;
    this.prefix = options.keyPrefix ?? "otok:cache:";
  }

  private entryKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private tagIndex(tag: string): string {
    return `${this.prefix}tag:${tag}`;
  }

  private pathIndex(path: string): string {
    return `${this.prefix}path:${path}`;
  }

  async get(key: string): Promise<CacheLookupResult | undefined> {
    const raw = await this.client.get(this.entryKey(key));
    if (!raw) return { hit: "miss" };
    try {
      return lookupEntry(JSON.parse(raw) as CacheEntry);
    } catch {
      return { hit: "miss" };
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const full = this.entryKey(key);
    const ttl = entryTtlMs(entry);
    await this.client.set(full, JSON.stringify(entry), ttl ? { px: ttl } : undefined);
    for (const tag of entry.tags) {
      await this.client.sadd(this.tagIndex(tag), full);
    }
    await this.client.sadd(this.pathIndex(entry.path), full);
  }

  async delete(key: string): Promise<boolean> {
    return (await this.client.del(this.entryKey(key))) > 0;
  }

  async deleteByTag(tag: string): Promise<number> {
    const index = this.tagIndex(tag);
    const members = await this.client.smembers(index);
    if (members.length === 0) return 0;
    await this.client.del(...members, index);
    return members.length;
  }

  async deleteByPath(path: string): Promise<number> {
    const index = this.pathIndex(path);
    const members = await this.client.smembers(index);
    if (members.length === 0) return 0;
    await this.client.del(...members, index);
    return members.length;
  }
}

/** Cloudflare KV-compatible namespace binding. */
export interface EdgeKvNamespace {
  get(key: string, type?: "text"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface EdgeKvCacheProviderOptions {
  namespace: EdgeKvNamespace;
  keyPrefix?: string;
}

async function readJsonSet(ns: EdgeKvNamespace, key: string): Promise<string[]> {
  const raw = await ns.get(key, "text");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function writeJsonSet(ns: EdgeKvNamespace, key: string, members: string[]): Promise<void> {
  if (members.length === 0) {
    await ns.delete(key);
    return;
  }
  await ns.put(key, JSON.stringify([...new Set(members)]));
}

export class EdgeKvCacheProvider implements CacheProvider {
  readonly name = "edge-kv";
  private readonly ns: EdgeKvNamespace;
  private readonly prefix: string;

  constructor(options: EdgeKvCacheProviderOptions) {
    this.ns = options.namespace;
    this.prefix = options.keyPrefix ?? "otok:cache:";
  }

  private entryKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private tagIndex(tag: string): string {
    return `${this.prefix}tag:${tag}`;
  }

  private pathIndex(path: string): string {
    return `${this.prefix}path:${path}`;
  }

  async get(key: string): Promise<CacheLookupResult | undefined> {
    const raw = await this.ns.get(this.entryKey(key), "text");
    if (!raw) return { hit: "miss" };
    try {
      return lookupEntry(JSON.parse(raw) as CacheEntry);
    } catch {
      return { hit: "miss" };
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const full = this.entryKey(key);
    const ttlSeconds = entry.maxAge + entry.staleWhileRevalidate;
    await this.ns.put(full, JSON.stringify(entry), ttlSeconds > 0 ? { expirationTtl: Math.max(60, ttlSeconds) } : undefined);

    for (const tag of entry.tags) {
      const index = this.tagIndex(tag);
      const members = await readJsonSet(this.ns, index);
      members.push(full);
      await writeJsonSet(this.ns, index, members);
    }

    const pathIndex = this.pathIndex(entry.path);
    const pathMembers = await readJsonSet(this.ns, pathIndex);
    pathMembers.push(full);
    await writeJsonSet(this.ns, pathIndex, pathMembers);
  }

  async delete(key: string): Promise<boolean> {
    const full = this.entryKey(key);
    const existing = await this.ns.get(full, "text");
    await this.ns.delete(full);
    return existing != null;
  }

  async deleteByTag(tag: string): Promise<number> {
    const index = this.tagIndex(tag);
    const members = await readJsonSet(this.ns, index);
    for (const member of members) await this.ns.delete(member);
    await this.ns.delete(index);
    return members.length;
  }

  async deleteByPath(path: string): Promise<number> {
    const index = this.pathIndex(path);
    const members = await readJsonSet(this.ns, index);
    for (const member of members) await this.ns.delete(member);
    await this.ns.delete(index);
    return members.length;
  }
}


