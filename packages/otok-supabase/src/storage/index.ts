import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Access Supabase Storage through the typed client.
 * Future helpers for signed URLs and upload policies will live here.
 */
export function getSupabaseStorage<Database>(
  client: SupabaseClient<Database>,
): SupabaseClient<Database>["storage"] {
  return client.storage;
}

export type { SupabaseClient };
