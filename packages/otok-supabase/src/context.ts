import type { Context } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OtokContext } from "@kamod-ch/otok/server";
import { getSupabaseRuntime, tryGetSupabaseRuntime } from "./registry.js";

export function supabaseFromHono<Database = unknown>(
  hono: Context | OtokContext["hono"],
  contextKey = "supabase",
): SupabaseClient<Database> {
  const client = hono.get(contextKey as never) as SupabaseClient<Database> | undefined;
  if (!client) {
    const runtime = tryGetSupabaseRuntime();
    throw new Error(
      runtime
        ? `otok-supabase: Supabase client not found on Hono context key "${contextKey}". Mount supabase() middleware first.`
        : "otok-supabase: no runtime registered. Add supabase() to otok.config.ts plugins.",
    );
  }
  return client;
}

export function getSupabaseConfig() {
  return getSupabaseRuntime().config;
}
