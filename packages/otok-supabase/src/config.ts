import { SupabaseConfigurationError } from "./errors.js";

export interface SupabaseCookieOptions {
  domain?: string;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
}

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  cookieOptions?: SupabaseCookieOptions;
}

export interface SupabaseAdminConfig {
  url: string;
  serviceRoleKey: string;
}

const URL_PATTERN = /^https?:\/\/.+/;

function decodeJwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function assertNotServiceRoleKey(key: string, label: string): void {
  const payload = decodeJwtPayload(key);
  if (payload?.role === "service_role") {
    throw new SupabaseConfigurationError(
      `${label} must not be a service role key. Use the publishable (anon) key for browser and SSR clients.`,
    );
  }
}

export function validateSupabaseConfig(config: SupabaseConfig): SupabaseConfig {
  if (!config || typeof config !== "object") {
    throw new SupabaseConfigurationError("Supabase configuration must be an object.");
  }

  const url = String(config.url ?? "").trim();
  if (!url) {
    throw new SupabaseConfigurationError("Supabase url is required.");
  }
  if (!URL_PATTERN.test(url)) {
    throw new SupabaseConfigurationError("Supabase url must be an absolute http(s) URL.");
  }

  const publishableKey = String(config.publishableKey ?? "").trim();
  if (!publishableKey) {
    throw new SupabaseConfigurationError("Supabase publishableKey is required.");
  }
  assertNotServiceRoleKey(publishableKey, "publishableKey");

  return {
    url,
    publishableKey,
    cookieOptions: config.cookieOptions,
  };
}

export function validateSupabaseAdminConfig(config: SupabaseAdminConfig): SupabaseAdminConfig {
  if (!config || typeof config !== "object") {
    throw new SupabaseConfigurationError("Supabase admin configuration must be an object.");
  }

  const url = String(config.url ?? "").trim();
  if (!url) {
    throw new SupabaseConfigurationError("Supabase url is required.");
  }
  if (!URL_PATTERN.test(url)) {
    throw new SupabaseConfigurationError("Supabase url must be an absolute http(s) URL.");
  }

  const serviceRoleKey = String(config.serviceRoleKey ?? "").trim();
  if (!serviceRoleKey) {
    throw new SupabaseConfigurationError("Supabase serviceRoleKey is required.");
  }

  return { url, serviceRoleKey };
}

export function mergeCookieOptions(
  supabaseOptions: Record<string, unknown> | undefined,
  defaults: SupabaseCookieOptions | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(supabaseOptions ?? {}) };
  if (defaults?.domain !== undefined) merged.domain = defaults.domain;
  if (defaults?.path !== undefined) merged.path = defaults.path;
  if (defaults?.secure !== undefined) merged.secure = defaults.secure;
  if (defaults?.sameSite !== undefined) {
    merged.sameSite = defaults.sameSite;
  }
  if (!merged.path) merged.path = "/";
  return merged;
}
