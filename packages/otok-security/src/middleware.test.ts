import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { configureSecurityApp } from "./middleware.js";
import { safeRedirectTarget } from "./redirect.js";
import { createMemoryRateLimitProvider } from "./rate-limit.js";

describe("open redirect guard", () => {
  it("blocks external redirect query params", async () => {
    const app = new Hono();
    configureSecurityApp(app, { strict: false, csp: false, csrf: false, trustedHosts: ["localhost"] });
    app.get("/", (c) => c.text("ok"));

    const blocked = await app.request("/?redirect=https://evil.test");
    expect(blocked.status).toBe(400);

    const allowed = await app.request("/?redirect=/dashboard");
    expect(allowed.status).toBe(200);
  });
});

describe("safeRedirectTarget", () => {
  const ctx = (origin = "https://example.com") =>
    ({
      req: { url: `${origin}/page` },
    }) as Parameters<typeof safeRedirectTarget>[1];

  it("rejects off-site redirects", () => {
    const c = ctx();
    expect(() => safeRedirectTarget("https://evil.test", c)).toThrow(/unsafe redirect/);
    expect(safeRedirectTarget("/dashboard", c)).toBe("/dashboard");
  });

  it("allows absolute same-origin URLs and returns href", () => {
    const c = ctx("https://example.com");
    expect(safeRedirectTarget("https://example.com/dashboard", c)).toBe("https://example.com/dashboard");
  });

  it("rejects traversal and encoded traversal in query guard paths", async () => {
    const app = new Hono();
    configureSecurityApp(app, { strict: false, csp: false, csrf: false, trustedHosts: ["localhost"] });
    app.get("/", (c) => c.text("ok"));

    expect((await app.request("/?redirect=/.//evil.test")).status).toBe(400);
    expect((await app.request("/?redirect=/dashboard\\evil")).status).toBe(400);
  });

  it("rejects credentials in redirect targets", () => {
    const c = ctx();
    expect(() => safeRedirectTarget("https://user:pass@example.com/dashboard", c)).toThrow(/unsafe redirect/);
  });
});

function securityApp(options: Parameters<typeof configureSecurityApp>[1]) {
  const app = new Hono();
  configureSecurityApp(app, { strict: false, csp: false, csrf: false, ...options });
  let hit = false;
  app.all("/", (c) => {
    hit = true;
    return c.text("ok");
  });
  return {
    app,
    wasHit: () => hit,
    resetHit: () => {
      hit = false;
    },
  };
}

describe("trusted host and origin validation", () => {
  it("enforces trustedOrigins without trustedHosts", async () => {
    const { app, wasHit, resetHit } = securityApp({ trustedOrigins: ["https://trusted.test"] });
    resetHit();
    const allowed = await app.request("/", {
      method: "POST",
      headers: { origin: "https://trusted.test" },
    });
    expect(allowed.status).toBe(200);
    expect(wasHit()).toBe(true);

    resetHit();
    const blocked = await app.request("/", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    });
    expect(blocked.status).toBe(403);
    expect(wasHit()).toBe(false);
  });

  it("enforces trustedHosts without origin checks on GET", async () => {
    const { app } = securityApp({ trustedHosts: ["localhost"] });
    expect((await app.request("/", { headers: { host: "evil.test" } })).status).toBe(400);
    expect((await app.request("/", { headers: { host: "localhost" } })).status).toBe(200);
    expect(
      (
        await app.request("/", {
          method: "POST",
          headers: { host: "localhost", origin: "https://evil.test" },
        })
      ).status,
    ).toBe(200);
  });

  it("enforces both host and origin when configured", async () => {
    const { app, wasHit, resetHit } = securityApp({
      trustedHosts: ["localhost"],
      trustedOrigins: ["https://trusted.test"],
    });
    resetHit();
    expect(
      (
        await app.request("/", {
          method: "POST",
          headers: { host: "localhost", origin: "https://trusted.test" },
        })
      ).status,
    ).toBe(200);
    expect(wasHit()).toBe(true);

    resetHit();
    expect(
      (
        await app.request("/", {
          method: "POST",
          headers: { host: "evil.test", origin: "https://trusted.test" },
        })
      ).status,
    ).toBe(400);
    expect(wasHit()).toBe(false);

    resetHit();
    expect(
      (
        await app.request("/", {
          method: "POST",
          headers: { host: "localhost", origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
    expect(wasHit()).toBe(false);
  });

  it("allows GET with foreign origin and POST without origin header", async () => {
    const { app, wasHit } = securityApp({ trustedOrigins: ["https://trusted.test"] });
    expect(
      (
        await app.request("/", {
          method: "GET",
          headers: { origin: "https://evil.test" },
        })
      ).status,
    ).toBe(200);
    expect((await app.request("/", { method: "POST" })).status).toBe(200);
    expect(wasHit()).toBe(true);
  });

  it("normalizes trailing slash on trusted origins", async () => {
    const { app } = securityApp({ trustedOrigins: ["https://trusted.test/"] });
    expect(
      (
        await app.request("/", {
          method: "PUT",
          headers: { origin: "https://trusted.test" },
        })
      ).status,
    ).toBe(200);
  });

  it("passes through when both lists are empty", async () => {
    const { app } = securityApp({ trustedHosts: [], trustedOrigins: [] });
    expect((await app.request("/", { method: "POST", headers: { origin: "https://evil.test" } })).status).toBe(200);
  });

  it("warns in production when trustedHosts is empty even with trustedOrigins", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      configureSecurityApp(new Hono(), { trustedOrigins: ["https://trusted.test"] });
      expect(warn).toHaveBeenCalledWith(
        "otok-security: trustedHosts is empty in production. Set trustedHosts to your public hostnames.",
      );
    } finally {
      warn.mockRestore();
      process.env.NODE_ENV = previous;
    }
  });
});

describe("rate limit", () => {
  it("returns 429 when limit exceeded", async () => {
    const app = new Hono();
    configureSecurityApp(app, {
      strict: false,
      csp: false,
      csrf: false,
      trustedHosts: ["localhost"],
      rateLimit: createMemoryRateLimitProvider({ limit: 1, windowMs: 60_000 }),
    });
    app.get("/", (c) => c.text("ok"));

    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(429);
  });
});

describe("production strict mode", () => {
  it("rejects disabling CSP in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() => configureSecurityApp(new Hono(), { csp: false })).toThrow(/CSP cannot be disabled/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
