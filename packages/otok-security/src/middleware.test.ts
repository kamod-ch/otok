import { describe, expect, it } from "vitest";
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
  it("rejects off-site redirects", () => {
    const c = {
      req: { url: "https://example.com/page" },
    } as Parameters<typeof safeRedirectTarget>[1];
    expect(() => safeRedirectTarget("https://evil.test", c)).toThrow(/unsafe redirect/);
    expect(safeRedirectTarget("/dashboard", c)).toBe("/dashboard");
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
