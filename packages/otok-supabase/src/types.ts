import type { SupabaseClient } from "@supabase/supabase-js";
import type { JwtPayload } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { SupabaseConfig } from "./config.js";

export type { SupabaseClient, User, JwtPayload };

export interface SupabaseVariables<Database = unknown> {
  supabase: SupabaseClient<Database>;
}

export interface SupabaseClaimsVariables {
  supabaseClaims: JwtPayload;
}

export interface SupabaseUserVariables {
  supabaseUser: User;
}

export type SupabaseEnv<Database = unknown> = {
  Variables: SupabaseVariables<Database>;
};

export type SupabaseAuthClaimsEnv<Database = unknown> = {
  Variables: SupabaseVariables<Database> & SupabaseClaimsVariables;
};

export type SupabaseAuthUserEnv<Database = unknown> = {
  Variables: SupabaseVariables<Database> & SupabaseUserVariables;
};

export type SupabaseAuthFullEnv<Database = unknown> = {
  Variables: SupabaseVariables<Database> & SupabaseClaimsVariables & SupabaseUserVariables;
};

export interface SupabaseAuthRoutesOptions {
  successRedirect?: string;
  errorRedirect?: string;
  callbackPath?: string;
  confirmPath?: string;
  signOutPath?: string;
  redirectAllowlist?: readonly string[];
}

export interface RequireSupabaseAuthOptions {
  redirectTo?: string;
  response?: "redirect" | "json";
  redirectAllowlist?: readonly string[];
}

export interface RequireSupabaseUserOptions extends RequireSupabaseAuthOptions {}

export interface SupabasePluginOptions extends SupabaseConfig {
  /** Mount callback, confirm, and sign-out routes. Default: true. */
  mountAuthRoutes?: boolean;
  /** Options passed to `createSupabaseAuthRoutes`. */
  authRoutes?: SupabaseAuthRoutesOptions;
}

export interface SupabaseRuntime {
  config: SupabaseConfig;
  authRoutes: SupabaseAuthRoutesOptions;
  mountAuthRoutes: boolean;
}

export type SupabaseActionResult<T = unknown> =
  | { ok: true; data?: T; redirect?: string }
  | { ok: false; status: number; message: string; fieldErrors?: Record<string, string[]> };
