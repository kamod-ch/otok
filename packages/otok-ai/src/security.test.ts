import { describe, expect, it } from "vitest";
import { redactText, containsSecrets, stripEnvValues } from "./redaction/redact.js";
import { sanitizeContextOutput, collectAiContext, generateAiContext } from "./context/generate.js";
import { Hono } from "hono";
import { mountMcpRoutes, isRouteMcpAllowed } from "./mcp/server.js";

describe("redaction", () => {
  it("redacts API keys and bearer tokens", () => {
    const input = "Use sk-abcdefghijklmnopqrstuvwxyz123456 and Bearer eyJhbGciOiJIUzI1NiJ9.test";
    expect(redactText(input)).not.toContain("sk-abc");
    expect(containsSecrets(input)).toBe(true);
  });

  it("strips env-like secret keys from objects", () => {
    const obj = stripEnvValues({ OPENAI_API_KEY: "sk-secret", name: "app" });
    expect(obj.OPENAI_API_KEY).toBe("[REDACTED]");
    expect(obj.name).toBe("app");
  });

  it("sanitizes generated context output", () => {
    const dirty = "token=ghp_abcdefghijklmnopqrstuvwxyz1234567890";
    expect(sanitizeContextOutput(dirty)).not.toContain("ghp_");
  });
});

describe("ai-context generation", () => {
  it("produces deterministic structure", async () => {
    const payload = await collectAiContext(process.cwd());
    expect(payload.publicApis.length).toBeGreaterThan(0);
    expect(payload.routeConventions.length).toBeGreaterThan(0);
    expect(payload.generatedAt).toMatch(/^\d{4}-/);
  });

  it("generates markdown without secrets", async () => {
    process.env.OPENAI_API_KEY = "sk-test-should-not-appear-in-output-ever";
    const md = await generateAiContext({ root: process.cwd(), format: "markdown" });
    expect(md).not.toContain("sk-test-should-not-appear");
    expect(md).toContain("Otok AI Context");
    delete process.env.OPENAI_API_KEY;
  });

  it("generates valid JSON format", async () => {
    const json = await generateAiContext({ root: process.cwd(), format: "json" });
    const parsed = JSON.parse(json);
    expect(parsed.plugins).toBeInstanceOf(Array);
  });
});

describe("MCP permissions", () => {
  it("only exposes allowlisted routes", () => {
    expect(isRouteMcpAllowed("/dashboard", ["/dashboard"])).toBe(true);
    expect(isRouteMcpAllowed("/admin", ["/dashboard"])).toBe(false);
  });

  it("rejects calls to non-allowlisted tools", async () => {
    const app = new Hono();
    mountMcpRoutes(app, {
      path: "/api/mcp",
      allowedRoutes: ["/public"],
      fetchImpl: async () => new Response("{}"),
    });

    const denied = await app.request("/api/mcp/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "admin_settings", arguments: {} }),
    });
    expect(denied.status).toBe(404);
  });

  it("allows calls to allowlisted routes", async () => {
    const app = new Hono();
    app.get("/public", (c) => c.json({ ok: true }));
    mountMcpRoutes(app, {
      path: "/api/mcp",
      allowedRoutes: ["/public"],
      fetchImpl: (path, init) => Promise.resolve(app.request(path, init)),
    });

    const res = await app.request("/api/mcp/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "public", arguments: {} }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toEqual({ ok: true });
  });
});
