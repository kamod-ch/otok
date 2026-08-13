import type { RealtimeChannel, RealtimeChannelOptions, SupabaseClient } from "@supabase/supabase-js";

export type { RealtimeChannel, SupabaseClient };

/**
 * Create a Supabase Realtime channel through the typed client.
 * Future Otok-specific presence and SSR-safe subscription helpers will live here.
 */
export function createSupabaseChannel<Database>(
  client: SupabaseClient<Database>,
  name: string,
  options?: RealtimeChannelOptions,
): RealtimeChannel {
  return client.channel(name, options);
}
