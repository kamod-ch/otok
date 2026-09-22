import { describe, expect, it, vi } from "vitest";
import {
  buildCacheControlHeader,
  buildCacheKey,
  MemoryCacheProvider,
  revalidatePath,
  revalidateTag,
  withCacheStampedeProtection,
} from "./index.js";

describe("cache headers", () => {
  it("builds CDN-compatible Cache-Control", () => {
    expect(
      buildCacheControlHeader({
        public: true,
        maxAge: 60,
        sMaxAge: 300,
        staleWhileRevalidate: 120,
      }),
    ).toBe("public, max-age=60, s-maxage=300, stale-while-revalidate=120");
  });

  it("forces no-store", () => {
    expect(buildCacheControlHeader({ noStore: true })).toBe("no-store");
  });
});

describe("cache keys", () => {
  it("separates scope and query", () => {
    const base = buildCacheKey({
      method: "GET",
      routeId: "products",
      requestPath: "/products",
      query: [],
      shared: true,
    });
    const localized = buildCacheKey({
      method: "GET",
      routeId: "products",
      requestPath: "/products",
      query: [],
      shared: false,
      userId: "u1",
    });
    expect(base).not.toBe(localized);
  });
});

describe("cache provider", () => {
  it("supports hit, miss, and tag revalidation", async () => {
    const provider = new MemoryCacheProvider();
    const key = buildCacheKey({
      method: "GET",
      routeId: "about",
      requestPath: "/about",
      query: [],
      shared: true,
    });
    await provider.set(key, {
      value: "<html></html>",
      tags: ["pages"],
      path: "/about",
      createdAt: Date.now(),
      maxAge: 60,
      staleWhileRevalidate: 0,
      private: false,
    });

    expect((await provider.get(key))?.hit).toBe("fresh");
    expect(await revalidateTag("pages", provider)).toBe(1);
    expect((await provider.get(key))?.hit).toBe("miss");
  });

  it("revalidates by path", async () => {
    const provider = new MemoryCacheProvider();
    await provider.set("a", {
      value: "a",
      tags: [],
      path: "/contact",
      createdAt: Date.now(),
      maxAge: 10,
      staleWhileRevalidate: 0,
      private: false,
    });
    expect(await revalidatePath("/contact", provider)).toBe(1);
  });

  it("drops expired entries on read", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const provider = new MemoryCacheProvider({ now: () => Date.now() });
    const key = "k";
    await provider.set(key, {
      value: "html",
      tags: [],
      path: "/",
      createdAt: Date.now(),
      maxAge: 1,
      staleWhileRevalidate: 0,
      private: false,
    });
    vi.advanceTimersByTime(2000);
    expect((await provider.get(key))?.hit).toBe("miss");
    vi.useRealTimers();
  });
});

describe("stampede protection", () => {
  it("deduplicates concurrent factories", async () => {
    let calls = 0;
    const factory = async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "ok";
    };

    const [a, b] = await Promise.all([
      withCacheStampedeProtection("key", factory),
      withCacheStampedeProtection("key", factory),
    ]);

    expect(a).toBe("ok");
    expect(b).toBe("ok");
    expect(calls).toBe(1);
  });
});
