import { describe, expect, it } from "vitest";
import { createOtokSupabaseServerClient } from "./server/create-server-client.js";
import { TEST_PUBLISHABLE_KEY, TEST_SUPABASE_URL } from "./test/fixtures.js";

const integrationEnabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);

describe.skipIf(!integrationEnabled)("supabase integration", () => {
  it("creates a live server client", async () => {
    const { Hono } = await import("hono");
    const app = new Hono();
    app.get("/", (c) => {
      const client = createOtokSupabaseServerClient(c, {
        url: process.env.SUPABASE_URL!,
        publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
      });
      return c.json({ ok: Boolean(client.auth) });
    });
    const response = await app.request("/");
    expect(await response.json()).toEqual({ ok: true });
  });
});
