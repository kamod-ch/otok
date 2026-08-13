import type { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { defineMiddleware, type OtokMiddleware } from "@kamod-ch/otok/server";
import { attachSecureCookieDefaults, resolveSecureCookieDefaults } from "./cookies.js";
import { createSecurityCsrfMiddleware } from "./csrf.js";
import { createOpenRedirectGuard } from "./redirect.js";
import { createRateLimitMiddleware } from "./rate-limit.js";
import type { CspOptions, SecurityPluginOptions } from "./types.js";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

const DEFAULT_CSP: Record<string, string> = {
  "default-src": "'self'",
  "base-uri": "'self'",
  "font-src": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
  "img-src": "'self' data: https:",
  "object-src": "'none'",
  "script-src": "'self'",
  "style-src": "'self' 'unsafe-inline'",
  "upgrade-insecure-requests": "",
};

function normalizeHosts(hosts: string[] | undefined): string[] {
  return (hosts ?? []).map((host) => host.toLowerCase());
}

function buildCspDirectives(options: CspOptions | true | undefined): Record<string, string> {
  const base = { ...DEFAULT_CSP };
  if (!options || options === true) return base;
  for (const [key, value] of Object.entries(options.directives ?? {})) {
    base[key] = Array.isArray(value) ? value.join(" ") : value;
  }
  if (options.reportUri) base["report-uri"] = options.reportUri;
  return base;
}

function createHostValidationMiddleware(trustedHosts: string[], trustedOrigins: string[]): OtokMiddleware {
  const hosts = normalizeHosts(trustedHosts);
  const origins = new Set(trustedOrigins.map((o) => o.replace(/\/$/, "")));

  return defineMiddleware(async (c, next) => {
    const host = c.req.header("host")?.split(":")[0]?.toLowerCase();
    if (hosts.length > 0 && host && !hosts.includes(host)) {
      return c.text("Invalid Host", 400);
    }

    const method = c.req.method.toUpperCase();
    if (origins.size > 0 && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const origin = c.req.header("origin");
      if (origin && !origins.has(origin.replace(/\/$/, ""))) {
        return c.text("Invalid Origin", 403);
      }
    }

    await next();
  });
}

export function assertSecureConfiguration(options: SecurityPluginOptions): void {
  if (options.strict === false) return;
  if (!isProduction()) return;

  if (options.csp === false) {
    throw new Error("otok-security: CSP cannot be disabled in production (set strict: false to override)");
  }
  if (options.csrf === false) {
    throw new Error("otok-security: CSRF cannot be disabled in production (set strict: false to override)");
  }
  if (options.secureHeaders === false) {
    throw new Error("otok-security: secureHeaders cannot be disabled in production");
  }
}

/** Apply security middleware stack to a Hono app. Order: rate limit → host → redirect guard → body limit → CORS → CSRF → headers/CSP. */
export function configureSecurityApp(app: Hono, options: SecurityPluginOptions): void {
  assertSecureConfiguration(options);

  const cookieDefaults = resolveSecureCookieDefaults(options.secureCookies ?? true);
  app.use("*", async (c, next) => {
    attachSecureCookieDefaults(c, cookieDefaults);
    await next();
  });

  if (options.rateLimit) {
    app.use("*", createRateLimitMiddleware(options.rateLimit, options.proxy?.clientIpHeader));
  }

  const trustedHosts = options.trustedHosts ?? (isProduction() ? [] : undefined);
  const trustedOrigins = options.trustedOrigins ?? [];
  if (trustedHosts && trustedHosts.length > 0) {
    app.use("*", createHostValidationMiddleware(trustedHosts, trustedOrigins));
  } else if (isProduction() && options.strict !== false) {
    console.warn(
      "otok-security: trustedHosts is empty in production. Set trustedHosts to your public hostnames.",
    );
  }

  if (options.openRedirectGuard !== false) {
    app.use("*", createOpenRedirectGuard(typeof options.openRedirectGuard === "object" ? options.openRedirectGuard : {}));
  }

  if (options.bodyLimit !== false) {
    app.use("*", bodyLimit({ maxSize: typeof options.bodyLimit === "number" ? options.bodyLimit : 1024 * 1024 }));
  }

  if (options.cors) {
    app.use(
      "*",
      cors({
        origin: options.cors.origin,
        allowMethods: options.cors.allowMethods ?? ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: options.cors.allowHeaders,
        exposeHeaders: options.cors.exposeHeaders,
        maxAge: options.cors.maxAge,
        credentials: options.cors.credentials ?? false,
      }),
    );
  }

  const csrfEnabled = options.csrf !== false && (options.csrf === true || isProduction() || typeof options.csrf === "object");
  if (csrfEnabled) {
    app.use("*", createSecurityCsrfMiddleware(typeof options.csrf === "object" ? options.csrf : {}));
  }

  if (options.secureHeaders !== false) {
    const cspEnabled = options.csp !== false;
    const directives = cspEnabled
      ? buildCspDirectives(typeof options.csp === "object" ? options.csp : {})
      : undefined;
    app.use(
      "*",
      secureHeaders({
        contentSecurityPolicy: directives,
        ...(typeof options.secureHeaders === "object" ? options.secureHeaders.overrides : {}),
      }),
    );
  }
}

export { createOpenRedirectGuard, createRateLimitMiddleware, createSecurityCsrfMiddleware };
