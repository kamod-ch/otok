import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import { validateSupabaseConfig, type SupabaseConfig } from "../config.js";
import { createOtokSupabaseCookieMethods } from "./cookies.js";

export function createOtokSupabaseServerClient<Database>(
  context: Context,
  config: SupabaseConfig,
): SupabaseClient<Database> {
  const validated = validateSupabaseConfig(config);
  const cookies = createOtokSupabaseCookieMethods(context, validated);

  return createServerClient<Database>(validated.url, validated.publishableKey, {
    cookies,
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

export { createOtokSupabaseCookieMethods, readRequestCookies, writeResponseCookie } from "./cookies.js";
