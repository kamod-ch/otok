import { describe, expect, it } from "vitest";
import {
  TEST_PUBLISHABLE_KEY,
  TEST_SERVICE_ROLE_KEY,
  TEST_SUPABASE_URL,
} from "./test/fixtures.js";
import {
  validateSupabaseAdminConfig,
  validateSupabaseConfig,
} from "./config.js";
import { SupabaseConfigurationError } from "./errors.js";

describe("validateSupabaseConfig", () => {
  it("accepts valid configuration", () => {
    const config = validateSupabaseConfig({
      url: TEST_SUPABASE_URL,
      publishableKey: TEST_PUBLISHABLE_KEY,
      cookieOptions: { path: "/", sameSite: "lax" },
    });
    expect(config.url).toBe(TEST_SUPABASE_URL);
    expect(config.publishableKey).toBe(TEST_PUBLISHABLE_KEY);
  });

  it("rejects missing url", () => {
    expect(() => validateSupabaseConfig({ url: "", publishableKey: TEST_PUBLISHABLE_KEY })).toThrow(
      SupabaseConfigurationError,
    );
  });

  it("rejects invalid url", () => {
    expect(() =>
      validateSupabaseConfig({ url: "not-a-url", publishableKey: TEST_PUBLISHABLE_KEY }),
    ).toThrow(/absolute http/);
  });

  it("rejects missing publishable key", () => {
    expect(() => validateSupabaseConfig({ url: TEST_SUPABASE_URL, publishableKey: "" })).toThrow(
      /publishableKey/,
    );
  });

  it("rejects service role keys for publishable config", () => {
    expect(() =>
      validateSupabaseConfig({ url: TEST_SUPABASE_URL, publishableKey: TEST_SERVICE_ROLE_KEY }),
    ).toThrow(/service role/);
  });

  it("never includes keys in error messages", () => {
    try {
      validateSupabaseConfig({ url: TEST_SUPABASE_URL, publishableKey: TEST_SERVICE_ROLE_KEY });
    } catch (error) {
      expect(String(error)).not.toContain(TEST_SERVICE_ROLE_KEY);
    }
  });
});

describe("validateSupabaseAdminConfig", () => {
  it("accepts admin configuration", () => {
    const config = validateSupabaseAdminConfig({
      url: TEST_SUPABASE_URL,
      serviceRoleKey: TEST_SERVICE_ROLE_KEY,
    });
    expect(config.serviceRoleKey).toBe(TEST_SERVICE_ROLE_KEY);
  });
});
