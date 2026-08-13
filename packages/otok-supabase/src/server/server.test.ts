import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  createMockSupabaseClient,
  TEST_PUBLISHABLE_KEY,
  TEST_SUPABASE_URL,
} from "../test/fixtures.js";
import { readRequestCookies, getSetCookieHeaders, mergeResponseHeaders, createOtokSupabaseCookieMethods } from "./cookies.js";

const mockClient = createMockSupabaseClient();
let capturedCookies: {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (
    cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>,
    headers?: Record<string, string>,
  ) => void;
} | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: typeof capturedCookies }) => {
    capturedCookies = options.cookies;
    return mockClient;
  }),
  parseCookieHeader: (header: string) =>
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((pair) => {
        const [name, ...rest] = pair.split("=");
        return { name: name!, value: rest.join("=") };
      }),
  serializeCookieHeader: (name: string, value: string) => `${name}=${value}; Path=/`,
  createBrowserClient: vi.fn(),
}));

import type { SupabaseEnv } from "../types.js";
import { supabase } from "./middleware.js";

describe("cookie adapter", () => {
  beforeEach(() => {
    capturedCookies = null;
  });

  it("reads single and multiple request cookies", async () => {
    const app = new Hono<SupabaseEnv>();
    app.get("/cookies", (c) => c.json(readRequestCookies(c)));

    const single = await app.request("/cookies", {
      headers: { cookie: "sb-access-token=abc" },
    });
    expect(await single.json()).toEqual([{ name: "sb-access-token", value: "abc" }]);

    const multiple = await app.request("/cookies", {
      headers: { cookie: "sb-access-token=abc; sb-refresh-token=def" },
    });
    expect(await multiple.json()).toEqual([
      { name: "sb-access-token", value: "abc" },
      { name: "sb-refresh-token", value: "def" },
    ]);
  });

  it("writes multiple Set-Cookie headers and preserves existing headers", async () => {
    const app = new Hono<SupabaseEnv>();
    app.use("*", async (c, next) => {
      c.header("x-custom", "keep-me");
      await next();
      c.header("x-after", "also-keep");
    });
    app.get("/set", (c) => {
      const cookies = createOtokSupabaseCookieMethods(c, {
        url: TEST_SUPABASE_URL,
        publishableKey: TEST_PUBLISHABLE_KEY,
      });
      cookies.setAll(
        [
          { name: "sb-access-token", value: "new-access", options: { path: "/" } },
          { name: "sb-refresh-token", value: "new-refresh", options: { path: "/" } },
        ],
        { "Cache-Control": "no-store" },
      );
      return c.text("ok");
    });

    const response = await app.request("/set");
    const cookies = getSetCookieHeaders(response);
    expect(cookies.length).toBeGreaterThanOrEqual(2);
    expect(response.headers.get("x-custom")).toBe("keep-me");
    expect(response.headers.get("x-after")).toBe("also-keep");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("merges response headers without overwriting existing values", () => {
    const existing = new Headers({ "x-custom": "1", "content-type": "text/plain" });
    const incoming = new Headers({ "set-cookie": "a=1", "x-extra": "2" });
    const merged = mergeResponseHeaders(existing, incoming);
    expect(merged.get("x-custom")).toBe("1");
    expect(merged.get("x-extra")).toBe("2");
    expect(merged.get("set-cookie")).toBe("a=1");
  });
});

describe("supabase middleware", () => {
  beforeEach(() => {
    capturedCookies = null;
    vi.clearAllMocks();
  });

  it("creates a fresh client per request", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const app = new Hono<SupabaseEnv>();
    app.use(
      "*",
      supabase({
        url: TEST_SUPABASE_URL,
        publishableKey: TEST_PUBLISHABLE_KEY,
      }),
    );
    app.get("/ping", (c) => c.text(String(Boolean(c.var.supabase))));

    await app.request("/ping");
    await app.request("/ping");
    expect(createServerClient).toHaveBeenCalledTimes(2);
  });

  it("exposes typed supabase client on context", async () => {
    const app = new Hono<SupabaseEnv>();
    app.use(
      "*",
      supabase({
        url: TEST_SUPABASE_URL,
        publishableKey: TEST_PUBLISHABLE_KEY,
      }),
    );
    app.get("/projects", async (c) => {
      const { data } = await c.var.supabase.from("projects").select();
      return c.json(data);
    });

    const response = await app.request("/projects");
    expect(await response.json()).toEqual([{ id: "p1", name: "Alpha" }]);
  });

  it("refreshes session cookies during middleware", async () => {
    const refresh = vi.fn(async () => ({ data: { session: null }, error: null }));
    const client = createMockSupabaseClient({ getSession: refresh });
    const { createServerClient } = await import("@supabase/ssr");
    vi.mocked(createServerClient).mockReturnValueOnce(client as never);

    const app = new Hono<SupabaseEnv>();
    app.use(
      "*",
      supabase({
        url: TEST_SUPABASE_URL,
        publishableKey: TEST_PUBLISHABLE_KEY,
      }),
    );
    app.get("/", (c) => c.text("ok"));
    await app.request("/");
    expect(refresh).toHaveBeenCalled();
  });
});
