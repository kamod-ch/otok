import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import { validateSupabaseConfig, type SupabaseConfig } from "../config.js";
import type { SupabaseEnv } from "../types.js";
import { createOtokSupabaseServerClient } from "./create-server-client.js";

export function supabase<Database = unknown>(
  config: SupabaseConfig,
): MiddlewareHandler<SupabaseEnv<Database>> {
  const validated = validateSupabaseConfig(config);

  return createMiddleware<SupabaseEnv<Database>>(async (c, next) => {
    const client = createOtokSupabaseServerClient<Database>(c, validated);
    c.set("supabase", client);
    await client.auth.getSession();
    await next();
  });
}

export { createOtokSupabaseServerClient } from "./create-server-client.js";
