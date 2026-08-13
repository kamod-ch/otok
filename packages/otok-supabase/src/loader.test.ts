import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineLoader } from "./loader.js";
import { registerSupabaseRuntime, resetSupabaseRuntimeForTests } from "./registry.js";
import { createMockSupabaseClient, TEST_PUBLISHABLE_KEY, TEST_SUPABASE_URL } from "./test/fixtures.js";

describe("defineLoader", () => {
  beforeEach(() => resetSupabaseRuntimeForTests());

  it("injects supabase from hono context", async () => {
    registerSupabaseRuntime({
      config: { url: TEST_SUPABASE_URL, publishableKey: TEST_PUBLISHABLE_KEY },
      authRoutes: {},
      mountAuthRoutes: true,
    });

    const mockClient = createMockSupabaseClient();
    const loader = defineLoader(async ({ supabase }) => {
      const { data } = await supabase.from("projects").select();
      return { projects: data };
    });

    const result = await loader({
      hono: { get: () => mockClient } as never,
      request: new Request("http://localhost/dashboard"),
      params: {},
      route: "/dashboard",
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ projects: [{ id: "p1", name: "Alpha" }] });
  });
});
