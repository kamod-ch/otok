// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { OTOK_PAGE_ATTR } from "../shared/navigation.js";
import {
  __softNavPrefetchTestState,
  invalidateSoftNavPrefetch,
  parseSoftNavHtmlResponse,
  prefetchSoftNavUrl,
  prefetchTtlMs,
  setSoftNavPrefetchScope,
  shouldStoreSoftNavPrefetch,
  takePrefetchedNavigationDocument,
} from "./soft-nav-prefetch.js";

const htmlPage = `<!doctype html><html><body><div ${OTOK_PAGE_ATTR}><p>Hi</p></div></body></html>`;

function mockResponse(init: { ok?: boolean; url?: string; headers?: Record<string, string>; body?: string }): Response {
  const response = new Response(init.body ?? htmlPage, {
    status: init.ok === false ? 500 : 200,
    headers: { "content-type": "text/html", ...init.headers },
  });
  if (init.url) {
    Object.defineProperty(response, "url", { value: init.url });
  }
  return response;
}

afterEach(() => {
  invalidateSoftNavPrefetch();
  setSoftNavPrefetchScope({});
  vi.unstubAllGlobals();
});

describe("shouldStoreSoftNavPrefetch", () => {
  it("rejects no-store and private responses", () => {
    expect(shouldStoreSoftNavPrefetch(mockResponse({ headers: { "cache-control": "no-store" } }))).toBe(false);
    expect(shouldStoreSoftNavPrefetch(mockResponse({ headers: { "cache-control": "private, max-age=60" } }))).toBe(
      false,
    );
  });

  it("rejects responses that vary on cookie or authorization", () => {
    expect(shouldStoreSoftNavPrefetch(mockResponse({ headers: { vary: "Cookie, Accept-Language" } }))).toBe(false);
  });

  it("accepts public cacheable HTML", () => {
    expect(shouldStoreSoftNavPrefetch(mockResponse({ headers: { "cache-control": "public, max-age=120" } }))).toBe(
      true,
    );
  });
});

describe("prefetchTtlMs", () => {
  it("uses max-age when present", () => {
    const ttl = prefetchTtlMs(mockResponse({ headers: { "cache-control": "max-age=45" } }));
    expect(ttl).toBe(45_000);
  });
});

describe("parseSoftNavHtmlResponse", () => {
  it("requires same-origin final URL and page marker", () => {
    const ok = parseSoftNavHtmlResponse(mockResponse({ url: "http://localhost/a" }), "http://localhost/a", htmlPage);
    expect(ok?.url).toBe("http://localhost/a");

    const cross = parseSoftNavHtmlResponse(
      mockResponse({ url: "https://evil.example/landing" }),
      "http://localhost/a",
      htmlPage,
    );
    expect(cross).toBeNull();

    const noPage = parseSoftNavHtmlResponse(mockResponse({}), "http://localhost/x", "<p>nope</p>");
    expect(noPage).toBeNull();
  });
});

describe("prefetch cache lifecycle", () => {
  it("dedupes in-flight prefetches and respects invalidation generation", async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({
        headers: { "cache-control": "max-age=60" },
        url: "http://localhost/target",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    prefetchSoftNavUrl("http://localhost/target");
    prefetchSoftNavUrl("http://localhost/target");
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(__softNavPrefetchTestState().cacheSize).toBe(1);

    invalidateSoftNavPrefetch({ reason: "mutation" });
    expect(takePrefetchedNavigationDocument("http://localhost/target")).toBeNull();
  });

  it("drops stale entries after TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockResponse({
          headers: { "cache-control": "max-age=1" },
          url: "http://localhost/ttl",
        }),
      ),
    );

    prefetchSoftNavUrl("http://localhost/ttl");
    await vi.runAllTimersAsync();

    vi.setSystemTime(new Date("2020-01-01T00:00:02Z"));
    expect(takePrefetchedNavigationDocument("http://localhost/ttl")).toBeNull();
    vi.useRealTimers();
  });

  it("clears cache when auth scope changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockResponse({
          url: "http://localhost/scope",
          headers: { "cache-control": "max-age=120" },
        }),
      ),
    );

    prefetchSoftNavUrl("http://localhost/scope");
    await new Promise((r) => setTimeout(r, 0));
    expect(__softNavPrefetchTestState().cacheSize).toBe(1);

    setSoftNavPrefetchScope({ authEpoch: "user-b" });
    expect(__softNavPrefetchTestState().cacheSize).toBe(0);
    expect(takePrefetchedNavigationDocument("http://localhost/scope")).toBeNull();
  });

  it("stores final redirect URL for history consumption", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) =>
        mockResponse({
          url: input === "http://localhost/start" ? "http://localhost/final" : input,
          headers: { "cache-control": "max-age=30" },
        }),
      ),
    );

    prefetchSoftNavUrl("http://localhost/start");
    await new Promise((r) => setTimeout(r, 0));

    const taken = takePrefetchedNavigationDocument("http://localhost/start");
    expect(taken?.url).toBe("http://localhost/final");
  });
});
