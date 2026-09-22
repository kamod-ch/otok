import { describe, expect, it } from "vitest";
import { buildCacheKey, encodeQueryEntries, resolveRequestVaryHeaders } from "./key.js";

describe("encodeQueryEntries", () => {
  it("preserves repeated parameter order within each key", () => {
    expect(
      encodeQueryEntries([
        ["tag", "b"],
        ["tag", "a"],
        ["page", "1"],
      ]),
    ).toBe("page=1&tag=b&tag=a");
  });
});

describe("buildCacheKey", () => {
  it("separates route id, request path, scope, and vary", () => {
    const base = buildCacheKey({
      method: "GET",
      routeId: "routes/search.tsx",
      requestPath: "/search",
      query: [["q", "a"]],
      shared: true,
    });
    const otherQuery = buildCacheKey({
      method: "GET",
      routeId: "routes/search.tsx",
      requestPath: "/search",
      query: [["q", "b"]],
      shared: true,
    });
    const scoped = buildCacheKey({
      method: "GET",
      routeId: "routes/search.tsx",
      requestPath: "/search",
      query: [["q", "a"]],
      shared: false,
      userId: "u1",
    });

    expect(base).not.toBe(otherQuery);
    expect(base).not.toBe(scoped);
    expect(base.startsWith("v1|")).toBe(true);
  });

  it("uses identical keys for matching vary inputs", () => {
    const input = {
      method: "GET",
      routeId: "r1",
      requestPath: "/x",
      query: [] as const,
      shared: true,
      varyHeaders: { "accept-language": "de-CH" },
    };
    expect(buildCacheKey(input)).toBe(buildCacheKey(input));
  });
});

describe("resolveRequestVaryHeaders", () => {
  it("treats Vary: * as uncacheable", () => {
    const result = resolveRequestVaryHeaders({ vary: ["*"] }, new Headers());
    expect(result).toEqual({ kind: "uncacheable", reason: "vary-star" });
  });

  it("normalizes header names when reading values", () => {
    const headers = new Headers({ "Accept-Language": "en-US" });
    const result = resolveRequestVaryHeaders({ vary: ["accept-language"] }, headers);
    expect(result).toEqual({ kind: "ok", headers: { "accept-language": "en-US" } });
  });
});
