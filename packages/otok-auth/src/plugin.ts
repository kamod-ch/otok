import { definePlugin } from "@kamod-ch/otok";
import type { Hono } from "hono";
import type { Context } from "hono";
import { createAuthHelpers } from "./context.js";
import { createCsrfMiddleware } from "./middleware/csrf.js";
import { createRequireAuthMiddleware } from "./middleware/require-auth.js";
import { registerAuthRuntime } from "./registry.js";
import { createSessionManager } from "./session/manager.js";
import type { AuthPluginOptions, AuthUser } from "./types.js";

function resolveSessionCookie(options: AuthPluginOptions["session"]): string {
  return options.cookieName ?? options.sessionCookie ?? "otok_session";
}

function resolveSecret(options: Pick<AuthPluginOptions, "secret">): string {
  const secret = options.secret ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("otok-auth: provide secret (min 32 bytes) or set AUTH_SECRET");
  }
  return secret;
}

function configureAuthApp(app: Hono, options: AuthPluginOptions): void {
  resolveSecret(options);

  const sessionCookie = resolveSessionCookie(options.session);
  const csrfCookie = options.session.csrfCookie ?? "otok_csrf";
  const contextKey = options.contextKey ?? "user";
  const loginPath = options.loginPath ?? "/login";
  const logoutPath = options.logoutPath ?? "/auth/logout";
  const redirectAllowlist = options.redirectAllowlist ?? ["/"];

  const sessions = createSessionManager<AuthUser>(
    {
      sessionCookie,
      csrfCookie,
      maxAgeSeconds: options.session.maxAgeSeconds,
      secure: options.session.secure,
      sameSite: options.session.sameSite,
      path: options.session.path,
      rotationIntervalSeconds: options.session.rotationIntervalSeconds,
    },
    options.adapter,
  );

  const helpers = createAuthHelpers({
    sessions,
    contextKey,
    loginPath,
    redirectAllowlist,
    getRole: options.getRole,
  });

  registerAuthRuntime({
    sessions,
    helpers,
    contextKey,
    loginPath,
    logoutPath,
    redirectAllowlist,
  });

  app.post(logoutPath, async (c) => {
    await sessions.revokeSession(c);
    return c.redirect(loginPath, 303);
  });

  app.use("*", async (c, next) => {
    const user = await sessions.getSessionUser(c);
    if (user) (c as Context).set(contextKey, user);
    await next();
  });
}

const authPluginFactory = definePlugin<AuthPluginOptions>({
  name: "@kamod-ch/otok-auth",
  version: "1.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("auth() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.session || typeof record.session !== "object") {
        throw new Error("auth() requires session options");
      }
      if (!record.adapter || typeof record.adapter !== "object") {
        throw new Error("auth() requires a SessionAdapter");
      }
      return input as AuthPluginOptions;
    },
  },
  envSchema: {
    parse(input) {
      return {
        authSecret: input.AUTH_SECRET,
      };
    },
  },
});

/** Otok plugin factory — register after `auth()` in otok.config.ts. */
export default function auth(options: AuthPluginOptions) {
  const plugin = authPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureAuthApp(app, options);
  };
  return plugin;
}

/** Factory for programmatic (non-plugin) setup — same options as the plugin. */
export function createAuthRuntime<TUser extends AuthUser>(
  options: AuthPluginOptions<TUser>,
): ReturnType<typeof createAuthHelpers<TUser>> & {
  sessions: ReturnType<typeof createSessionManager<TUser>>;
  middleware: {
    requireAuth: ReturnType<typeof createRequireAuthMiddleware<TUser>>;
    csrf: ReturnType<typeof createCsrfMiddleware>;
  };
} {
  resolveSecret(options);
  const sessionCookie = resolveSessionCookie(options.session);
  const csrfCookie = options.session.csrfCookie ?? "otok_csrf";
  const contextKey = options.contextKey ?? "user";
  const loginPath = options.loginPath ?? "/login";
  const redirectAllowlist = options.redirectAllowlist ?? ["/"];

  const sessions = createSessionManager<TUser>(
    {
      sessionCookie,
      csrfCookie,
      maxAgeSeconds: options.session.maxAgeSeconds,
      secure: options.session.secure,
      sameSite: options.session.sameSite,
      path: options.session.path,
      rotationIntervalSeconds: options.session.rotationIntervalSeconds,
    },
    options.adapter,
  );

  const helpers = createAuthHelpers({
    sessions,
    contextKey,
    loginPath,
    redirectAllowlist,
    getRole: options.getRole,
  });

  return {
    ...helpers,
    sessions,
    middleware: {
      requireAuth: createRequireAuthMiddleware({
        getUser: (c: Context) => sessions.getSessionUser(c),
        loginPath,
        contextKey,
      }),
      csrf: createCsrfMiddleware({ cookieName: csrfCookie }),
    },
  };
}

export { configureAuthApp };
