import { describe, expect, it } from "vitest";
import { createOtokSupabaseAdminClient } from "./create-admin-client.js";
import { TEST_SERVICE_ROLE_KEY, TEST_SUPABASE_URL } from "../test/fixtures.js";

describe("createOtokSupabaseAdminClient", () => {
  it("creates a server-side admin client", () => {
    const client = createOtokSupabaseAdminClient({
      url: TEST_SUPABASE_URL,
      serviceRoleKey: TEST_SERVICE_ROLE_KEY,
    });
    expect(client.auth).toBeDefined();
  });
});

describe("root entry point separation", () => {
  it("does not export admin helpers from the root package", async () => {
    const root = await import("../index.js");
    expect(root).not.toHaveProperty("createOtokSupabaseAdminClient");
  });
});
