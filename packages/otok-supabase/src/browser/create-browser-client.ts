import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSupabaseConfig, type SupabaseConfig } from "../config.js";

let browserClient: SupabaseClient<any> | undefined;

export function createOtokSupabaseBrowserClient<Database>(
  config: SupabaseConfig,
): SupabaseClient<Database> {
  const validated = validateSupabaseConfig(config);

  if (typeof window === "undefined") {
    throw new Error(
      "otok-supabase: createOtokSupabaseBrowserClient() must only be called in the browser.",
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(validated.url, validated.publishableKey, {
      cookieOptions: validated.cookieOptions
        ? {
            domain: validated.cookieOptions.domain,
            path: validated.cookieOptions.path,
            sameSite: validated.cookieOptions.sameSite,
            secure: validated.cookieOptions.secure,
          }
        : undefined,
    });
  }

  return browserClient as SupabaseClient<Database>;
}

/** Reset the browser singleton — for tests only. */
export function resetOtokSupabaseBrowserClientForTests(): void {
  browserClient = undefined;
}
