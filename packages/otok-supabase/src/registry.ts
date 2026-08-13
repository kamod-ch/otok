import type { SupabaseRuntime } from "./types.js";

let runtime: SupabaseRuntime | null = null;

/** @internal Test helper */
export function resetSupabaseRuntimeForTests(): void {
  runtime = null;
}

export function registerSupabaseRuntime(value: SupabaseRuntime): void {
  runtime = value;
}

export function getSupabaseRuntime(): SupabaseRuntime {
  if (!runtime) {
    throw new Error(
      "otok-supabase: no runtime registered. Add supabase() to otok.config.ts plugins or call registerSupabaseRuntime().",
    );
  }
  return runtime;
}

export function tryGetSupabaseRuntime(): SupabaseRuntime | null {
  return runtime;
}
