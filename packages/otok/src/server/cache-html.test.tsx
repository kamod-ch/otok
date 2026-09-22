import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOtokHandler, setCacheProvider, setOtokCacheScope } from "./index.js";
import { MemoryCacheProvider } from "../cache/index.js";
import type { OtokRoute } from "../shared/routes.js";
import { validationError } from "../shared/routes.js";

const Page = ({ data }: { data: { marker?: string; user?: string; tenant?: string; q?: string } }) => (
  <p>
    {data.marker ?? "OK"}
    {data.user ? `:u=${data.user}` : ""}
    {data.tenant ? `:t=${data.tenant}` : ""}
    {data.q ? `:q=${data.q}` : ""}
  </p>
);

function route(path: string, pattern: RegExp, module: OtokRoute["module"]): OtokRoute {
  return {
    id: `file:${path}`,
    path,
    pattern,
    params: [],
    module,
  };
}

describe("HTML cache isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    setCacheProvider(new MemoryCacheProvider({ maxEntries: 32, now: () => Date.now() }));
  });

  afterEach(() => {
    vi.useRealTimers();
    setCacheProvider(new MemoryCacheProvider());
  });

  it("hits shared cache for identical anonymous GET requests", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    let loads = 0;
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          route("/cached", /^\/cached\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            loader: () => {
              loads++;
              return { marker: `load-${loads}` };
            },
            rendering: defineRendering({ mode: "ssr", cache: { public: true, maxAge: 60 } }),
          }),
        ],
      }),
    );

    const first = await app.request("/cached");
    const second = await app.request("/cached");
    expect(first.headers.get("x-otok-cache")).toBeNull();
    expect(second.headers.get("x-otok-cache")).toBe("HIT");
    expect(await first.text()).toContain("load-1");
    expect(await second.text()).toContain("load-1");
    expect(loads).toBe(1);
  });

  it("does not share HTML cache between personalized users without mixing content", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/account", /^\/account\/?$/, {
              default: Page as OtokRoute["module"]["default"],
              loader: ({ hono }) => ({
                user: (hono.get("user" as never) as { id: string }).id,
              }),
              rendering: defineRendering({ mode: "ssr", cache: { maxAge: 120 } }),
            }),
            middleware: [
              {
                default: async (c, next) => {
                  const uid = c.req.header("x-test-user");
                  if (uid) c.set("user" as never, { id: uid });
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const a = await app.request("/account", { headers: { cookie: "session=1", "x-test-user": "alice" } });
    const b = await app.request("/account", { headers: { cookie: "session=1", "x-test-user": "bob" } });
    expect(a.headers.get("x-otok-cache")).toBeNull();
    expect(b.headers.get("x-otok-cache")).toBeNull();
    expect(await a.text()).toContain(":u=alice");
    expect(await b.text()).toContain(":u=bob");
  });

  it("isolates per-user cache when verified scope is present", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    let loads = 0;
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/account", /^\/account\/?$/, {
              default: Page as OtokRoute["module"]["default"],
              loader: ({ hono }) => ({
                user: (hono.get("user" as never) as { id: string }).id,
                marker: ++loads,
              }),
              rendering: defineRendering({ mode: "ssr", cache: { maxAge: 120, private: true } }),
            }),
            middleware: [
              {
                default: async (c, next) => {
                  c.set("user" as never, { id: c.req.header("x-test-user") ?? "anon" });
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const alice1 = await app.request("/account", { headers: { cookie: "session=1", "x-test-user": "alice" } });
    const alice2 = await app.request("/account", { headers: { cookie: "session=1", "x-test-user": "alice" } });
    const bob = await app.request("/account", { headers: { cookie: "session=1", "x-test-user": "bob" } });

    expect(alice1.headers.get("x-otok-cache")).toBeNull();
    expect(alice2.headers.get("x-otok-cache")).toBe("HIT");
    expect(bob.headers.get("x-otok-cache")).toBeNull();
    expect(await bob.text()).toContain(":u=bob");
    expect(loads).toBe(2);
  });

  it("isolates tenants via setOtokCacheScope", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/t", /^\/t\/?$/, {
              default: Page as OtokRoute["module"]["default"],
              loader: ({ hono }) => ({
                tenant: (hono.get("tenant" as never) as { id: string }).id,
              }),
              rendering: defineRendering({ mode: "ssr", cache: { maxAge: 60, private: true } }),
            }),
            middleware: [
              {
                default: async (c, next) => {
                  setOtokCacheScope(c, { tenantId: c.req.header("x-test-tenant") ?? "default" });
                  c.set("tenant" as never, { id: c.req.header("x-test-tenant") ?? "default" });
                  c.set("user" as never, { id: "shared-user" });
                  await next();
                },
              },
            ],
          },
        ],
      }),
    );

    const t1 = await app.request("/t", { headers: { cookie: "session=1", "x-test-tenant": "acme" } });
    const t2 = await app.request("/t", { headers: { cookie: "session=1", "x-test-tenant": "beta" } });
    expect(await t1.text()).toContain(":t=acme");
    expect(await t2.text()).toContain(":t=beta");
    expect(t2.headers.get("x-otok-cache")).toBeNull();
  });

  it("caches separately per query string including repeated keys", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          route("/search", /^\/search\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            loader: ({ hono }) => {
              const url = new URL(hono.req.url);
              const q = url.searchParams.get("q");
              const tags = url.searchParams.getAll("tag");
              return { q: q ?? tags.join(",") };
            },
            rendering: defineRendering({ mode: "ssr", cache: { public: true, maxAge: 60 } }),
          }),
        ],
      }),
    );

    const a = await app.request("/search?q=alpha");
    const b = await app.request("/search?q=beta");
    const repeat = await app.request("/search?tag=a&tag=b");
    expect(await a.text()).toContain(":q=alpha");
    expect(await b.text()).toContain(":q=beta");
    expect(await repeat.text()).toContain(":q=a,b");
    const hit = await app.request("/search?tag=a&tag=b");
    expect(hit.headers.get("x-otok-cache")).toBe("HIT");
  });

  it("respects Accept-Language vary configuration", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    let loads = 0;
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          route("/i18n", /^\/i18n\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            loader: () => ({ marker: ++loads }),
            rendering: defineRendering({
              mode: "ssr",
              cache: { public: true, maxAge: 60, vary: ["Accept-Language"] },
            }),
          }),
        ],
      }),
    );

    const de = await app.request("/i18n", { headers: { "accept-language": "de" } });
    const en = await app.request("/i18n", { headers: { "accept-language": "en" } });
    const deHit = await app.request("/i18n", { headers: { "accept-language": "de" } });
    expect(de.headers.get("x-otok-cache")).toBeNull();
    expect(en.headers.get("x-otok-cache")).toBeNull();
    expect(deHit.headers.get("x-otok-cache")).toBe("HIT");
    expect(loads).toBe(2);
  });

  it("skips cache for noStore routes", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    let loads = 0;
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          route("/live", /^\/live\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            loader: () => ({ marker: ++loads }),
            rendering: defineRendering({ mode: "ssr", cache: { noStore: true, maxAge: 60 } }),
          }),
        ],
      }),
    );

    await app.request("/live");
    const second = await app.request("/live");
    expect(second.headers.get("x-otok-cache")).toBeNull();
    expect(loads).toBe(2);
  });

  it("does not cache responses that set cookies", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    let loads = 0;
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          {
            ...route("/cookie", /^\/cookie\/?$/, {
              default: Page as OtokRoute["module"]["default"],
              loader: ({ hono }) => {
                setCookie(hono, "flash", "1", { path: "/" });
                return { marker: ++loads };
              },
              rendering: defineRendering({ mode: "ssr", cache: { public: true, maxAge: 60 } }),
            }),
          },
        ],
      }),
    );

    await app.request("/cookie");
    const second = await app.request("/cookie");
    expect(second.headers.get("x-otok-cache")).toBeNull();
    expect(loads).toBe(2);
  });

  it("does not cache error responses", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          route("/bad", /^\/bad\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            loader: () => {
              validationError({ message: "nope" }, 400);
            },
            rendering: defineRendering({ mode: "ssr", cache: { public: true, maxAge: 60 } }),
          }),
        ],
        errorRoute: {
          ...route("/_error", /^\/_error\/?$/, {
            default: (({ data }) => (
              <p>{String((data as { message: string }).message)}</p>
            )) as OtokRoute["module"]["default"],
          }),
        },
      }),
    );

    const response = await app.request("/bad");
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("recomputes after maxAge instead of serving stale SWR entries from server cache", async () => {
    const { defineRendering } = await import("../rendering/define.js");
    let loads = 0;
    const app = new Hono();
    app.get(
      "*",
      createOtokHandler({
        routes: [
          route("/swr", /^\/swr\/?$/, {
            default: Page as OtokRoute["module"]["default"],
            loader: () => ({ marker: ++loads }),
            rendering: defineRendering({
              mode: "ssr",
              cache: { public: true, maxAge: 5, staleWhileRevalidate: 300 },
            }),
          }),
        ],
      }),
    );

    await app.request("/swr");
    vi.advanceTimersByTime(6_000);
    const afterExpiry = await app.request("/swr");
    expect(afterExpiry.headers.get("x-otok-cache")).toBeNull();
    expect(await afterExpiry.text()).toContain("<p>2</p>");
    expect(loads).toBe(2);
  });
});

describe("MemoryCacheProvider limits", () => {
  it("evicts oldest entries beyond maxEntries", async () => {
    vi.useFakeTimers();
    const provider = new MemoryCacheProvider({ maxEntries: 2, now: () => Date.now() });
    const entry = {
      value: "x",
      tags: [],
      path: "/",
      createdAt: Date.now(),
      maxAge: 60,
      staleWhileRevalidate: 0,
      private: false,
    };
    await provider.set("a", entry);
    await provider.set("b", entry);
    await provider.set("c", entry);
    expect(await provider.get("a")).toEqual({ hit: "miss" });
    expect((await provider.get("c"))?.hit).toBe("fresh");
    vi.useRealTimers();
  });
});
