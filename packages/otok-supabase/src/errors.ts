import type { AuthError as SupabaseAuthApiError, PostgrestError } from "@supabase/supabase-js";
import type { OtokFailure } from "@kamod-ch/otok/server";

export type SupabaseIntegrationErrorCode =
  | "configuration"
  | "auth"
  | "cookie"
  | "runtime"
  | "unsafe_redirect";

export class OtokSupabaseError extends Error {
  readonly code: SupabaseIntegrationErrorCode;

  constructor(code: SupabaseIntegrationErrorCode, message: string) {
    super(`[otok-supabase:${code}] ${message}`);
    this.name = "OtokSupabaseError";
    this.code = code;
  }
}

export class SupabaseConfigurationError extends OtokSupabaseError {
  constructor(message: string) {
    super("configuration", message);
    this.name = "SupabaseConfigurationError";
  }
}

export class SupabaseAuthError extends OtokSupabaseError {
  readonly status: number;

  constructor(message: string, status = 401) {
    super("auth", message);
    this.name = "SupabaseAuthError";
    this.status = status;
  }
}

export class SupabaseCookieError extends OtokSupabaseError {
  constructor(message: string) {
    super("cookie", message);
    this.name = "SupabaseCookieError";
  }
}

type MappableError = PostgrestError | SupabaseAuthApiError | { message?: string; status?: number; code?: string };

const PUBLIC_AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  email_not_confirmed: "Please confirm your email before signing in.",
  user_already_exists: "An account with this email already exists.",
  weak_password: "Password is too weak.",
  over_request_rate_limit: "Too many requests. Please try again later.",
};

function sanitizeMessage(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/key|secret|token|password|service_role/i.test(message)) return fallback;
  return message;
}

function fieldErrorsFromAuthError(error: SupabaseAuthApiError): Record<string, string[]> | undefined {
  if (error.code === "invalid_credentials") {
    return { password: ["Invalid email or password."] };
  }
  if (error.code === "weak_password") {
    return { password: ["Password is too weak."] };
  }
  if (error.code === "user_already_exists") {
    return { email: ["An account with this email already exists."] };
  }
  return undefined;
}

export function mapSupabaseError(error: MappableError, fallbackMessage = "Request failed"): OtokFailure {
  const code = "code" in error ? error.code : undefined;
  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : code === "PGRST116"
        ? 404
        : 400;

  const publicMessage =
    (code && PUBLIC_AUTH_MESSAGES[code]) ||
    sanitizeMessage(error.message, fallbackMessage);

  return {
    status,
    message: publicMessage,
    fieldErrors: "name" in error && error.name === "AuthApiError" ? fieldErrorsFromAuthError(error as SupabaseAuthApiError) : undefined,
  };
}

export function throwSupabaseError(error: MappableError, fallbackMessage = "Request failed"): never {
  const failure = mapSupabaseError(error, fallbackMessage);
  throw Object.assign(new Error(failure.message), { failure, otokFailure: failure });
}

export function isSupabaseIntegrationError(error: unknown): error is OtokSupabaseError {
  return error instanceof OtokSupabaseError;
}
