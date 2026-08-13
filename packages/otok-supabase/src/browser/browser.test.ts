import { describe, expect, it } from "vitest";

describe("createOtokSupabaseBrowserClient", () => {
  it("does not access window at module import time", async () => {
    const mod = await import("./create-browser-client.js");
    expect(typeof mod.createOtokSupabaseBrowserClient).toBe("function");
  });

  it("throws when invoked on the server", async () => {
    const { createOtokSupabaseBrowserClient } = await import("./create-browser-client.js");
    const { TEST_PUBLISHABLE_KEY, TEST_SUPABASE_URL } = await import("../test/fixtures.js");
    expect(() =>
      createOtokSupabaseBrowserClient({
        url: TEST_SUPABASE_URL,
        publishableKey: TEST_PUBLISHABLE_KEY,
      }),
    ).toThrow(/browser/i);
  });
});
