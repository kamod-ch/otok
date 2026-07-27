import { generateCodeVerifier, generateState } from "arctic";
import type { Context } from "hono";
import type { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { OAuthAdapter, OAuthProviderId } from "./adapter/types.js";
import { OAuthFlowError, type OAuthErrorCode } from "./errors.js";
import { fetchGitHubProfile } from "./profile/github.js";
import { fetchGoogleProfile } from "./profile/google.js";
import { createGitHubClient, githubScopes } from "./providers/github.js";
import { createGoogleClient, googleScopes } from "./providers/google.js";
import type { OAuthProviderConfig } from "./providers/types.js";
import { safeNextPath } from "./redirect.js";
import {
  DEFAULT_MAX_AGE_MS,
  sealOAuthState,
  unsealOAuthState,
  type OAuthStatePayload,
} from "./state.js";

const DEFAULT_BASE_PATH = "/auth";
const DEFAULT_STATE_COOKIE = "otok_oauth_state";
const DEFAULT_LOGIN_PATH = "/login";
const STATE_COOKIE_MAX_AGE_SECONDS = Math.floor(DEFAULT_MAX_AGE_MS / 1000);

export type OAuthFlowOptions<TUser> = {
  secret: string;
  adapter: OAuthAdapter<TUser>;
  createSession: (c: Context, userId: string) => Promise<void>;
  providers: {
    github?: OAuthProviderConfig;
    google?: OAuthProviderConfig;
  };
  basePath?: string;
  stateCookie?: string;
  secure?: boolean | ((c: Context) => boolean);
  loginPath?: string;
  /** Called after a successful login, before redirect. */
  onSuccess?: (c: Context, user: TUser) => void | Promise<void>;
  /** Override default error redirect. */
  onError?: (c: Context, code: OAuthErrorCode) => Response | Promise<Response>;
};

export type OAuthFlow<TUser> = {
  mount(app: Hono): void;
  authorize(provider: OAuthProviderId): (c: Context) => Promise<Response>;
  callback(provider: OAuthProviderId): (c: Context) => Promise<Response>;
};

function resolveSecure(c: Context, secure?: boolean | ((c: Context) => boolean)): boolean {
  if (typeof secure === "function") return secure(c);
  if (typeof secure === "boolean") return secure;
  return process.env.NODE_ENV === "production";
}

function joinPath(base: string, ...parts: string[]): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base || "";
  const suffix = parts.map((part) => part.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
  return `${normalizedBase}/${suffix}`.replace(/\/{2,}/g, "/");
}

function errorRedirect(loginPath: string, code: OAuthErrorCode): Response {
  const url = new URL(loginPath, "http://localhost");
  url.searchParams.set("error", code);
  const location = `${url.pathname}${url.search}`;
  return new Response(null, {
    status: 303,
    headers: { Location: location },
  });
}

export function createOAuthFlow<TUser>(options: OAuthFlowOptions<TUser>): OAuthFlow<TUser> {
  if (!options.secret) {
    throw new Error("createOAuthFlow requires a non-empty secret");
  }

  const basePath = options.basePath ?? DEFAULT_BASE_PATH;
  const stateCookie = options.stateCookie ?? DEFAULT_STATE_COOKIE;
  const loginPath = options.loginPath ?? DEFAULT_LOGIN_PATH;

  async function fail(c: Context, code: OAuthErrorCode): Promise<Response> {
    if (options.onError) return options.onError(c, code);
    return errorRedirect(loginPath, code);
  }

  function authorize(provider: OAuthProviderId) {
    return async (c: Context): Promise<Response> => {
      const config = options.providers[provider];
      if (!config) return fail(c, "provider_unavailable");

      try {
        const state = generateState();
        const next = safeNextPath(c.req.query("next"));
        let codeVerifier: string | null = null;
        let authorizationURL: URL;

        if (provider === "github") {
          const client = createGitHubClient(config);
          authorizationURL = client.createAuthorizationURL(state, githubScopes(config));
        } else {
          const client = createGoogleClient(config);
          codeVerifier = generateCodeVerifier();
          authorizationURL = client.createAuthorizationURL(
            state,
            codeVerifier,
            googleScopes(config),
          );
        }

        const payload: OAuthStatePayload = {
          provider,
          state,
          codeVerifier,
          next,
          issuedAt: Date.now(),
        };

        setCookie(c, stateCookie, sealOAuthState(payload, options.secret), {
          httpOnly: true,
          secure: resolveSecure(c, options.secure),
          sameSite: "Lax",
          path: "/",
          maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
        });

        return c.redirect(authorizationURL.toString(), 302);
      } catch {
        return fail(c, "provider_error");
      }
    };
  }

  function callback(provider: OAuthProviderId) {
    return async (c: Context): Promise<Response> => {
      const config = options.providers[provider];
      if (!config) return fail(c, "provider_unavailable");

      const code = c.req.query("code");
      const returnedState = c.req.query("state");
      if (!code) return fail(c, "missing_code");
      if (!returnedState) return fail(c, "invalid_state");

      const cookieValue = getCookie(c, stateCookie);
      deleteCookie(c, stateCookie, { path: "/" });

      if (!cookieValue) return fail(c, "invalid_state");

      const payload = unsealOAuthState(cookieValue, options.secret);
      if (!payload || payload.provider !== provider || payload.state !== returnedState) {
        return fail(c, "invalid_state");
      }

      try {
        let accessToken: string;

        if (provider === "github") {
          const client = createGitHubClient(config);
          const tokens = await client.validateAuthorizationCode(code);
          accessToken = tokens.accessToken();
        } else {
          if (!payload.codeVerifier) return fail(c, "invalid_state");
          const client = createGoogleClient(config);
          const tokens = await client.validateAuthorizationCode(code, payload.codeVerifier);
          accessToken = tokens.accessToken();
        }

        let profile;
        try {
          profile =
            provider === "github"
              ? await fetchGitHubProfile(accessToken)
              : await fetchGoogleProfile(accessToken);
        } catch (error) {
          if (error instanceof OAuthFlowError) return fail(c, error.code);
          return fail(c, "profile_error");
        }

        let user: TUser;
        try {
          user = await options.adapter.findOrCreateUser(profile);
        } catch {
          return fail(c, "adapter_error");
        }

        const userId = options.adapter.getUserId(user);
        await options.createSession(c, userId);
        await options.onSuccess?.(c, user);

        const destination = payload.next ?? "/";
        return c.redirect(destination, 303);
      } catch (error) {
        if (error instanceof OAuthFlowError) return fail(c, error.code);
        return fail(c, "provider_error");
      }
    };
  }

  function mount(app: Hono): void {
    if (options.providers.github) {
      app.get(joinPath(basePath, "github"), authorize("github"));
      app.get(joinPath(basePath, "github", "callback"), callback("github"));
    }
    if (options.providers.google) {
      app.get(joinPath(basePath, "google"), authorize("google"));
      app.get(joinPath(basePath, "google", "callback"), callback("google"));
    }
  }

  return { mount, authorize, callback };
}
