import { describe, expect, it } from "vitest";
import {
  createRedisRestClient,
  EdgeKvCacheProvider,
  RedisCacheProvider,
  type EdgeKvNamespace,
  type RedisClient,
} from "./providers.js";

function createMemoryRedis(): RedisClient & { store: Map<string, string>; sets: Map<string, Set<string>> } {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    store,
    sets,
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(...keys) {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key) || sets.delete(key)) count++;
      }
      return count;
    },
    async sadd(key, ...members) {
      let set = sets.get(key);
      if (!set) {
        set = new Set();
        sets.set(key, set);
      }
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      }
      return added;
    },
    async srem(key, ...members) {
      const set = sets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) removed++;
      }
      return removed;
    },
    async smembers(key) {
      return [...(sets.get(key) ?? [])];
    },
  };
}

function createMemoryKv(): EdgeKvNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

describe("RedisCacheProvider", () => {
  it("stores, hits, and revalidates by tag", async () => {
    const client = createMemoryRedis();
    const provider = new RedisCacheProvider({ client });
    const key = "GET|/about|public|-|-";

    await provider.set(key, {
      value: "<html>about</html>",
      tags: ["pages"],
      path: "/about",
      createdAt: Date.now(),
      maxAge: 60,
      staleWhileRevalidate: 0,
      private: false,
    });

    expect((await provider.get(key))?.hit).toBe("fresh");
    expect(await provider.deleteByTag("pages")).toBe(1);
    expect((await provider.get(key))?.hit).toBe("miss");
  });

  it("revalidates by path", async () => {
    const client = createMemoryRedis();
    const provider = new RedisCacheProvider({ client, keyPrefix: "app:" });
    await provider.set("a", {
      value: "a",
      tags: [],
      path: "/contact",
      createdAt: Date.now(),
      maxAge: 10,
      staleWhileRevalidate: 0,
      private: false,
    });
    expect(await provider.deleteByPath("/contact")).toBe(1);
    expect((await provider.get("a"))?.hit).toBe("miss");
  });
});

describe("EdgeKvCacheProvider", () => {
  it("stores, hits, and revalidates by tag", async () => {
    const ns = createMemoryKv();
    const provider = new EdgeKvCacheProvider({ namespace: ns });
    const key = "GET|/home|public|-|-";

    await provider.set(key, {
      value: "<html>home</html>",
      tags: ["home"],
      path: "/home",
      createdAt: Date.now(),
      maxAge: 30,
      staleWhileRevalidate: 30,
      private: false,
    });

    expect((await provider.get(key))?.hit).toBe("fresh");
    expect(await provider.deleteByTag("home")).toBe(1);
    expect((await provider.get(key))?.hit).toBe("miss");
  });
});

describe("createRedisRestClient", () => {
  it("issues Redis REST commands via fetch", async () => {
    const calls: unknown[][] = [];
    const client = createRedisRestClient({
      url: "https://example.upstash.io",
      token: "test-token",
      fetch: async (_url, init) => {
        calls.push(JSON.parse(String(init?.body)) as unknown[]);
        return new Response(JSON.stringify({ result: "ok" }), { status: 200 });
      },
    });

    await client.set("k", "v", { px: 1000 });
    expect(calls[0]).toEqual(["SET", "k", "v", "PX", 1000]);
  });
});
