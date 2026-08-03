import { generateCodeVerifier, generateState } from "arctic";
import type { Context } from "hono";
import type { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { tryGetAuthRuntime } from "@kamod-ch/otok-auth/registry";
import type { OAuthAdapter, OAuthProviderId, OAuthTokenRefreshHandler } from "./adapter/types.js";
import { OAuthFlowError, type OAuthErrorCode } from "./errors.js";
import { fetchGitHubProfile } from "./profile/github.js";
import { fetchGitLabProfile } from "./profile/gitlab.js";
import { fetchGoogleProfile } from "./profile/google.js";
import { fetchMicrosoftProfile } from "./profile/microsoft.js";
import { createGitHubClient, githubScopes } from "./providers/github.js";
import { createGitLabClient, gitlabScopes, type GitLabProviderConfig } from "./providers/gitlab.js";
import { createGoogleClient, googleScopes } from "./providers/google.js";
import {
  createMicrosoftClient,
  microsoftScopes,
  type MicrosoftProviderConfig,
} from "./providers/microsoft.js";
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
  providers: Partial<Record<OAuthProviderId, OAuthProviderConfig>>;
  basePath?: string;
  stateCookie?: string;
  secure?: boolean | ((c: Context) => boolean);
  loginPath?: string;
  redirectAllowlist?: readonly string[];
  tokenRefresh?: OAuthTokenRefreshHandler;
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

function resolveAllowlist(options: OAuthFlowOptions<unknown>): readonly string[] {
  return options.redirectAllowlist ?? tryGetAuthRuntime()?.redirectAllowlist ?? ["/"];
}

export function createOAuthFlow<TUser>(options: OAuthFlowOptions<TUser>): OAuthFlow<TUser> {
  if (!options.secret) {
    throw new Error("createOAuthFlow requires a non-empty secret");
  }

  const basePath = options.basePath ?? DEFAULT_BASE_PATH;
  const stateCookie = options.stateCookie ?? DEFAULT_STATE_COOKIE;
  const loginPath = options.loginPath ?? DEFAULT_LOGIN_PATH;
  const allowlist = resolveAllowlist(options as OAuthFlowOptions<unknown>);

  async function fail(c: Context, code: OAuthErrorCode): Promise<Response> {
    if (options.onError) return options.onError(c, code);
    return errorRedirect(loginPath, code);
  }

  function authorize(provider: OAuthProviderId) {
    return async (c: Context): Promise<Response> => {
      const config = options.providers[provider];
      if (!config) return fail(c, "provider_unavailable");

      const providerError = c.req.query("error");
      if (providerError) return fail(c, "provider_error");

      try {
        const state = generateState();
        const next = safeNextPath(c.req.query("next"), allowlist);
        const link = c.req.query("link") === "1";
        let codeVerifier: string | null = null;
        let authorizationURL: URL;

        if (provider === "github") {
          const client = createGitHubClient(config);
          authorizationURL = client.createAuthorizationURL(state, githubScopes(config));
        } else if (provider === "google") {
          const client = createGoogleClient(config);
          codeVerifier = generateCodeVerifier();
          authorizationURL = client.createAuthorizationURL(
            state,
            codeVerifier,
            googleScopes(config),
          );
        } else if (provider === "microsoft") {
          const client = createMicrosoftClient(config as MicrosoftProviderConfig);
          codeVerifier = generateCodeVerifier();
          authorizationURL = client.createAuthorizationURL(
            state,
            codeVerifier,
            microsoftScopes(config),
          );
        } else if (provider === "gitlab") {
          const client = createGitLabClient(config as GitLabProviderConfig);
          authorizationURL = client.createAuthorizationURL(state, gitlabScopes(config));
        } else {
          return fail(c, "provider_unavailable");
        }

        const payload: OAuthStatePayload = {
          provider,
          state,
          codeVerifier,
          next,
          link,
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

      const providerError = c.req.query("error");
      if (providerError) return fail(c, "provider_error");

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
        let refreshToken: string | null = null;

        if (provider === "github") {
          const client = createGitHubClient(config);
          const tokens = await client.validateAuthorizationCode(code);
          accessToken = tokens.accessToken();
          refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
        } else if (provider === "google") {
          if (!payload.codeVerifier) return fail(c, "pkce_error");
          const client = createGoogleClient(config);
          const tokens = await client.validateAuthorizationCode(code, payload.codeVerifier);
          accessToken = tokens.accessToken();
          refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
        } else if (provider === "microsoft") {
          if (!payload.codeVerifier) return fail(c, "pkce_error");
          const client = createMicrosoftClient(config as MicrosoftProviderConfig);
          const tokens = await client.validateAuthorizationCode(code, payload.codeVerifier);
          accessToken = tokens.accessToken();
          refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
        } else if (provider === "gitlab") {
          const client = createGitLabClient(config as GitLabProviderConfig);
          const tokens = await client.validateAuthorizationCode(code);
          accessToken = tokens.accessToken();
          refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : null;
        } else {
          return fail(c, "provider_unavailable");
        }

        if (refreshToken && options.tokenRefresh) {
          await options.tokenRefresh.refresh(provider, refreshToken);
        }

        let profile;
        try {
          if (provider === "github") {
            profile = await fetchGitHubProfile(accessToken);
          } else if (provider === "google") {
            profile = await fetchGoogleProfile(accessToken);
          } else if (provider === "microsoft") {
            profile = await fetchMicrosoftProfile(accessToken);
          } else if (provider === "gitlab") {
            const baseURL = (config as GitLabProviderConfig).baseURL ?? "https://gitlab.com";
            profile = await fetchGitLabProfile(accessToken, baseURL);
          } else {
            return fail(c, "provider_unavailable");
          }
        } catch (error) {
          if (error instanceof OAuthFlowError) return fail(c, error.code);
          return fail(c, "profile_error");
        }

        let user: TUser;
        try {
          if (payload.link) {
            const runtime = tryGetAuthRuntime();
            const current = runtime ? await runtime.helpers.getSession(c) : null;
            if (!current || !options.adapter.linkAccount) {
              return fail(c, "link_verification_failed");
            }
            user = await options.adapter.linkAccount({ user: current as TUser, profile });
          } else {
            user = await options.adapter.findOrCreateUser(profile);
          }
        } catch {
          return fail(c, "adapter_error");
        }

        const userId = options.adapter.getUserId(user);
        if (!payload.link) {
          await options.createSession(c, userId);
        }
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
    for (const provider of Object.keys(options.providers) as OAuthProviderId[]) {
      if (!options.providers[provider]) continue;
      app.get(joinPath(basePath, provider), authorize(provider));
      app.get(joinPath(basePath, provider, "callback"), callback(provider));
    }
  }

  return { mount, authorize, callback };
}
