import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSupabaseAdminConfig, type SupabaseAdminConfig } from "../config.js";
import { SupabaseConfigurationError } from "../errors.js";

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new SupabaseConfigurationError(
      "createOtokSupabaseAdminClient() is server-only and must not run in the browser.",
    );
  }
}

export function createOtokSupabaseAdminClient<Database>(
  config: SupabaseAdminConfig,
): SupabaseClient<Database> {
  assertServerRuntime();
  const validated = validateSupabaseAdminConfig(config);

  return createClient<Database>(validated.url, validated.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
