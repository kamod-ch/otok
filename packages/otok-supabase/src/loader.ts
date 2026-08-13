import type { LoaderResult, OtokActionContext, OtokContext, OtokLoader } from "@kamod-ch/otok/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseFromHono } from "./context.js";

type LoaderSupabaseContext<Database> = {
  supabase: SupabaseClient<Database>;
};

type ActionSupabaseContext<Database> = LoaderSupabaseContext<Database>;

/**
 * Wrap a loader with typed `supabase` from the registered middleware.
 *
 * ```ts
 * export const loader = defineLoader<Database>(async ({ supabase }) => {
 *   const { data } = await supabase.from("projects").select("*");
 *   return { projects: data ?? [] };
 * });
 * ```
 */
export function defineLoader<Data extends LoaderResult, Database = unknown>(
  handler: (ctx: OtokContext & LoaderSupabaseContext<Database>) => Data | Promise<Data>,
  contextKey = "supabase",
): OtokLoader<Data> {
  return (context) =>
    handler({
      ...context,
      supabase: supabaseFromHono<Database>(context.hono, contextKey),
    });
}

/**
 * Wrap an action with typed `supabase` from the registered middleware.
 */
export function defineAction<Result, Database = unknown>(
  handler: (ctx: OtokActionContext & ActionSupabaseContext<Database>) => Result | Promise<Result>,
  contextKey = "supabase",
): (context: OtokActionContext) => Result | Promise<Result> {
  return (context) =>
    handler({
      ...context,
      supabase: supabaseFromHono<Database>(context.hono, contextKey),
    });
}
