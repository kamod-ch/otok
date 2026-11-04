import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createOAuthFlow } from "./flow.js";
import { sealOAuthState } from "./state.js";

const secret = "test-oauth-secret-at-least-32-chars!!";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createFlow() {
  const users = new Map<string, { id: string; email: string | null }>();
  const sessions: string[] = [];

  const flow = createOAuthFlow({
    secret,
    secure: false,
    loginPath: "/login",
    adapter: {
      async findOrCreateUser(profile) {
        const existing = users.get(`${profile.provider}:${profile.providerAccountId}`);
        if (existing) return existing;
        const user = {
          id: `user-${users.size + 1}`,
          email: profile.email,
        };
        users.set(`${profile.provider}:${profile.providerAccountId}`, user);
        return user;
      },
      getUserId: (user) => user.id,
    },
    createSession: async (_c, userId) => {
      sessions.push(userId);
    },
    providers: {
      github: {
        clientId: "gh-id",
        clientSecret: "gh-secret",
        redirectUri: "http://localhost/auth/github/callback",
      },
      google: {
        clientId: "google-id",
        clientSecret: "google-secret",
        redirectUri: "http://localhost/auth/google/callback",
      },
    },
  });

  return { flow, sessions, users };
}

describe("createOAuthFlow", () => {
  it("authorize sets state cookie and redirects to provider", async () => {
    const { flow } = createFlow();
    const app = new Hono();
    flow.mount(app);

    const response = await app.request("http://localhost/auth/github?next=/studio");
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("code_challenge")).toBeTruthy();

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("otok_oauth_state=");
  });

  it("callback creates session and redirects on happy path", async () => {
    const { flow, sessions } = createFlow();
    const app = new Hono();
    flow.mount(app);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("github.com/login/oauth/access_token")) {
          return Response.json({
            access_token: "gh-access-token",
            token_type: "bearer",
            id_token: "unused.invalid.jwt",
          });
        }
        if (url.includes("api.github.com/user/emails")) {
          return Response.json([{ email: "dev@example.com", primary: true, verified: true }]);
        }
        return Response.json({
          id: 7,
          login: "dev",
          name: "Dev",
          email: null,
          avatar_url: null,
        });
      }),
    );

    const stateToken = sealOAuthState(
      {
        provider: "github",
        state: "fixed-state",
        codeVerifier: "fixed-verifier",
        next: "/studio",
        issuedAt: Date.now(),
      },
      secret,
    );

    const response = await app.request("http://localhost/auth/github/callback?code=abc&state=fixed-state", {
      headers: {
        cookie: `otok_oauth_state=${stateToken}`,
      },
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/studio");
    expect(sessions).toEqual(["user-1"]);
  });

  it("callback rejects missing code", async () => {
    const { flow } = createFlow();
    const app = new Hono();
    flow.mount(app);

    const response = await app.request("http://localhost/auth/github/callback?state=fixed-state");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?error=missing_code");
  });

  it("callback rejects PKCE mismatch for Google", async () => {
    const { flow } = createFlow();
    const app = new Hono();
    flow.mount(app);

    const stateToken = sealOAuthState(
      {
        provider: "google",
        state: "fixed-state",
        codeVerifier: null,
        next: null,
        issuedAt: Date.now(),
      },
      secret,
    );

    const response = await app.request("http://localhost/auth/google/callback?code=abc&state=fixed-state", {
      headers: { cookie: `otok_oauth_state=${stateToken}` },
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?error=pkce_error");
  });

  it("callback rejects provider error query", async () => {
    const { flow } = createFlow();
    const app = new Hono();
    flow.mount(app);

    const response = await app.request("http://localhost/auth/github/callback?error=access_denied&state=fixed-state");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?error=provider_error");
  });

  it("callback rejects invalid state", async () => {
    const { flow } = createFlow();
    const app = new Hono();
    flow.mount(app);

    const response = await app.request("http://localhost/auth/github/callback?code=abc&state=wrong", {
      headers: {
        cookie: `otok_oauth_state=${sealOAuthState(
          {
            provider: "github",
            state: "fixed-state",
            codeVerifier: null,
            next: null,
            issuedAt: Date.now(),
          },
          secret,
        )}`,
      },
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?error=invalid_state");
  });

  it("authorize stores next for later callback", async () => {
    const { flow } = createFlow();
    const app = new Hono();
    app.get("/auth/github", async (c) => {
      const response = await flow.authorize("github")(c);
      const cookie = getCookie(c, "otok_oauth_state");
      return new Response(JSON.stringify({ cookie }), {
        status: response.status,
        headers: {
          Location: response.headers.get("Location") ?? "",
          "content-type": "application/json",
          "set-cookie": response.headers.get("set-cookie") ?? "",
        },
      });
    });

    const response = await app.request("http://localhost/auth/github?next=/dashboard");
    expect(response.status).toBe(302);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("otok_oauth_state=");
  });
});
