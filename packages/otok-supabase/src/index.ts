export { default, configureSupabaseApp } from "./plugin.js";
export type { SupabaseConfig, SupabaseAdminConfig, SupabaseCookieOptions } from "./config.js";
export type { SupabasePluginOptions } from "./types.js";
export { validateSupabaseConfig, validateSupabaseAdminConfig } from "./config.js";
export {
  mapSupabaseError,
  throwSupabaseError,
  isSupabaseIntegrationError,
  OtokSupabaseError,
  SupabaseConfigurationError,
  SupabaseAuthError,
  SupabaseCookieError,
} from "./errors.js";
export type {
  SupabaseClient,
  User,
  JwtPayload,
  SupabaseVariables,
  SupabaseClaimsVariables,
  SupabaseUserVariables,
  SupabaseEnv,
  SupabaseAuthClaimsEnv,
  SupabaseAuthUserEnv,
  SupabaseAuthFullEnv,
  SupabaseAuthRoutesOptions,
  RequireSupabaseAuthOptions,
  RequireSupabaseUserOptions,
  SupabaseActionResult,
  SupabaseRuntime,
} from "./types.js";
export {
  registerSupabaseRuntime,
  getSupabaseRuntime,
  tryGetSupabaseRuntime,
  resetSupabaseRuntimeForTests,
} from "./registry.js";
export { supabaseFromHono, getSupabaseConfig } from "./context.js";
export { createOtokSupabaseBrowserClient } from "./browser/index.js";
