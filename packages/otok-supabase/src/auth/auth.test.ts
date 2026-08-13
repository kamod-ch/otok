import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  createMockSupabaseClient,
  TEST_PUBLISHABLE_KEY,
  TEST_SUPABASE_URL,
} from "../test/fixtures.js";
import type { SupabaseAuthFullEnv, SupabaseEnv } from "../types.js";
import { supabase } from "../server/middleware.js";
import {
  requireSupabaseAuth,
  requireSupabaseUser,
  createSupabaseAuthRoutes,
  safeRedirectPath,
} from "../auth/index.js";
import { mapSupabaseError } from "../errors.js";

const mockClient = createMockSupabaseClient();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockClient),
  parseCookieHeader: (header: string) =>
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((pair) => {
        const [name, ...rest] = pair.split("=");
        return { name: name!, value: rest.join("=") };
      }),
  serializeCookieHeader: (name: string, value: string) => `${name}=${value}; Path=/`,
  createBrowserClient: vi.fn(),
}));

function createAuthedApp(options?: { claims?: boolean; user?: boolean }) {
  const app = new Hono<SupabaseEnv>();
  app.use(
    "*",
    supabase({
      url: TEST_SUPABASE_URL,
      publishableKey: TEST_PUBLISHABLE_KEY,
    }),
  );
  if (options?.claims !== false) {
    app.use("/protected-claims", requireSupabaseAuth({ redirectTo: "/login" }));
    app.get("/protected-claims", (c) =>
      c.json({ sub: (c.var as SupabaseAuthFullEnv["Variables"]).supabaseClaims.sub }),
    );
  }
  if (options?.user) {
    app.use("/protected-user", requireSupabaseUser({ redirectTo: "/login" }));
    app.get("/protected-user", (c) =>
      c.json({ id: (c.var as SupabaseAuthFullEnv["Variables"]).supabaseUser.id }),
    );
  }
  return app;
}

describe("requireSupabaseAuth", () => {
  beforeEach(() => {
    Object.assign(mockClient.auth, createMockSupabaseClient().auth);
  });

  it("allows authenticated claims requests", async () => {
    const app = createAuthedApp();
    const response = await app.request("/protected-claims");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sub: "user-1" });
  });

  it("redirects unauthenticated HTML requests", async () => {
    Object.assign(
      mockClient.auth,
      createMockSupabaseClient({
        getClaims: async () => ({ data: null, error: { message: "invalid" } }),
      }).auth,
    );
    const app = createAuthedApp();
    const response = await app.request("/protected-claims", {
      headers: { accept: "text/html" },
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("returns 401 JSON for API requests", async () => {
    Object.assign(
      mockClient.auth,
      createMockSupabaseClient({
        getClaims: async () => ({ data: null, error: { message: "invalid" } }),
      }).auth,
    );
    const app = createAuthedApp();
    const response = await app.request("/protected-claims", {
      headers: { accept: "application/json" },
    });
    expect(response.status).toBe(401);
  });
});

describe("requireSupabaseUser", () => {
  beforeEach(() => {
    Object.assign(mockClient.auth, createMockSupabaseClient().auth);
  });

  it("provides supabaseUser on success", async () => {
    const app = createAuthedApp({ claims: false, user: true });
    const response = await app.request("/protected-user");
    expect(await response.json()).toEqual({ id: "user-1" });
  });
});

describe("safeRedirectPath", () => {
  it("accepts allowlisted relative paths", () => {
    expect(safeRedirectPath("/dashboard", ["/", "/dashboard"])).toBe("/dashboard");
  });

  it("rejects protocol-relative and external paths", () => {
    expect(safeRedirectPath("//evil.example", ["/"])).toBeNull();
    expect(safeRedirectPath("https://evil.example", ["/"])).toBeNull();
  });
});

describe("createSupabaseAuthRoutes", () => {
  beforeEach(() => {
    Object.assign(mockClient.auth, createMockSupabaseClient().auth);
  });

  it("handles valid callback codes", async () => {
    const app = new Hono();
    app.use(
      "*",
      supabase({ url: TEST_SUPABASE_URL, publishableKey: TEST_PUBLISHABLE_KEY }),
    );
    createSupabaseAuthRoutes().mount(app);

    const response = await app.request("/auth/callback?code=valid-code", { redirect: "manual" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard");
  });

  it("handles invalid callback codes", async () => {
    Object.assign(
      mockClient.auth,
      createMockSupabaseClient({
        exchangeCodeForSession: async () => ({ error: { message: "invalid code", code: "invalid_credentials" } }),
      }).auth,
    );
    const app = new Hono();
    app.use(
      "*",
      supabase({ url: TEST_SUPABASE_URL, publishableKey: TEST_PUBLISHABLE_KEY }),
    );
    createSupabaseAuthRoutes().mount(app);

    const response = await app.request("/auth/callback?code=bad", { redirect: "manual" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("verifies email confirmation token_hash", async () => {
    const verifyOtp = vi.fn(async () => ({ error: null }));
    Object.assign(mockClient.auth, createMockSupabaseClient({ verifyOtp }).auth);

    const app = new Hono();
    app.use(
      "*",
      supabase({ url: TEST_SUPABASE_URL, publishableKey: TEST_PUBLISHABLE_KEY }),
    );
    createSupabaseAuthRoutes().mount(app);

    const response = await app.request("/auth/confirm?token_hash=hash&type=signup", {
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "hash" });
  });

  it("signs out via POST with CSRF", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    Object.assign(mockClient.auth, createMockSupabaseClient({ signOut }).auth);

    const app = new Hono();
    app.use(
      "*",
      supabase({ url: TEST_SUPABASE_URL, publishableKey: TEST_PUBLISHABLE_KEY }),
    );
    createSupabaseAuthRoutes().mount(app);

    const body = new URLSearchParams({ _csrf: "token-123" });
    const response = await app.request("/auth/signout", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: "otok_csrf=token-123",
      },
      body,
      redirect: "manual",
    });
    expect(response.status).toBe(303);
    expect(signOut).toHaveBeenCalled();
  });
});

describe("mapSupabaseError", () => {
  it("maps auth errors to safe public messages", () => {
    const failure = mapSupabaseError({ message: "secret key leaked", code: "invalid_credentials" });
    expect(failure.message).toBe("Invalid email or password.");
    expect(JSON.stringify(failure)).not.toMatch(/secret/i);
  });
});
