import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  createMockSupabaseClient,
  TEST_PUBLISHABLE_KEY,
  TEST_SUPABASE_URL,
} from "./test/fixtures.js";
import supabasePlugin, { configureSupabaseApp } from "./plugin.js";
import {
  getSupabaseRuntime,
  resetSupabaseRuntimeForTests,
} from "./registry.js";

const mockClient = createMockSupabaseClient();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockClient),
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

describe("supabase plugin", () => {
  beforeEach(() => {
    resetSupabaseRuntimeForTests();
    vi.clearAllMocks();
  });

  it("registers runtime and mounts middleware", async () => {
    const app = new Hono();
    configureSupabaseApp(app, {
      url: TEST_SUPABASE_URL,
      publishableKey: TEST_PUBLISHABLE_KEY,
      mountAuthRoutes: false,
    });

    const response = await app.request("/");
    expect(response.status).toBe(404);
    expect(getSupabaseRuntime().config.url).toBe(TEST_SUPABASE_URL);
  });

  it("mounts auth routes by default", async () => {
    const app = new Hono();
    configureSupabaseApp(app, {
      url: TEST_SUPABASE_URL,
      publishableKey: TEST_PUBLISHABLE_KEY,
    });

    const callback = await app.request("/auth/callback?code=test", { redirect: "manual" });
    expect(callback.status).toBe(303);
  });

  it("factory returns plugin with configureApp hook", () => {
    const plugin = supabasePlugin({
      url: TEST_SUPABASE_URL,
      publishableKey: TEST_PUBLISHABLE_KEY,
    });
    expect(plugin.name).toBe("@kamod-ch/otok-supabase");
    expect(typeof plugin.configureApp).toBe("function");
  });
});

describe("registerSupabaseRuntime", () => {
  it("throws when runtime is missing", () => {
    resetSupabaseRuntimeForTests();
    expect(() => getSupabaseRuntime()).toThrow(/no runtime registered/);
  });
});
