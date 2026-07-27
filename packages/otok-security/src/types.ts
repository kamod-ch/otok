import type { Context } from "hono";
import type { MiddlewareHandler } from "hono";
import type { ContentSecurityPolicyOptionHandler } from "hono/secure-headers";

export interface SecurityPluginOptions {
  /** Enable secure response headers. Default: true. */
  secureHeaders?: boolean | SecureHeadersOptions;
  /** Content Security Policy. Default: restrictive baseline. Set `false` to disable (not recommended). */
  csp?: boolean | CspOptions;
  /** CSRF protection for form submissions. Default: true in production. */
  csrf?: boolean | CsrfOptions;
  /** CORS configuration. Default: disabled (same-origin only). */
  cors?: false | CorsOptions;
  /** Request body size limit. Default: 1mb. */
  bodyLimit?: number | false;
  /** Trusted hostnames. Requests with mismatched Host are rejected when set. */
  trustedHosts?: string[];
  /** Trusted origins for Origin/Referer validation on state-changing requests. */
  trustedOrigins?: string[];
  /** Rate limit provider. No limit when omitted. */
  rateLimit?: RateLimitProvider;
  /** Block open redirects from query params. Default: true. */
  openRedirectGuard?: boolean | OpenRedirectOptions;
  /** Proxy / forwarded header configuration. */
  proxy?: ProxyOptions;
  /** Secure cookie defaults applied via middleware hints. Default: true in production. */
  secureCookies?: boolean | SecureCookieDefaults;
  /** When true, reject obviously insecure production configuration. Default: true. */
  strict?: boolean;
}

export interface SecureHeadersOptions {
  /** Override individual secure-headers options from Hono. */
  overrides?: Record<string, string | boolean>;
}

export interface CspOptions {
  /** CSP directives merged onto secure defaults. */
  directives?: Record<string, string | string[]>;
  /** Report-only mode. */
  reportOnly?: boolean;
  reportUri?: string;
}

export interface CsrfOptions {
  cookieName?: string;
  /** Set explicitly — never defaults to false in production when csrf is enabled. */
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface CorsOptions {
  origin:
    | string
    | string[]
    | ((origin: string, c: Context) => string | null | undefined | Promise<string | null | undefined>);
  allowMethods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

export interface OpenRedirectOptions {
  /** Query parameter names to inspect. Default: ["redirect", "returnTo", "next", "url"]. */
  params?: string[];
}

export interface ProxyOptions {
  /** Trust X-Forwarded-* headers from these proxy hops. Default: 1 when behind a reverse proxy. */
  trustProxy?: boolean | number;
  /** Header used for client IP when rate limiting. Default: `x-forwarded-for`. */
  clientIpHeader?: string;
}

export interface SecureCookieDefaults {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
}

export interface RateLimitContext {
  key: string;
  method: string;
  path: string;
  ip?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  resetAt?: number;
  retryAfterSeconds?: number;
}

export interface RateLimitProvider {
  check(ctx: RateLimitContext): RateLimitResult | Promise<RateLimitResult>;
}

export type { ContentSecurityPolicyOptionHandler };
