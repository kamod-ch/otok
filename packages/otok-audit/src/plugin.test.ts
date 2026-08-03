import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { configureAuditApp } from "./plugin.js";
import { createMemoryAuditStore } from "./providers/memory.js";
import { audit, registerAuditRuntime, resetAuditRuntimeForTests, createAuditService, hasAuditCapability } from "./registry.js";
import { withAuditTenant } from "./context.js";

describe("audit plugin", () => {
  it("registers runtime and exposes search/export routes", async () => {
    resetAuditRuntimeForTests();
    const app = new Hono();
    configureAuditApp(app, { provider: { type: "memory" } });

    await withAuditTenant("org-1", async () => {
      await audit.record({
        action: "company.created",
        resource: { type: "company", id: "a" },
      });
    });

    const searchRes = await app.request("/audit/search?tenantId=org-1");
    expect(searchRes.status).toBe(200);
    const searchBody = await searchRes.json();
    expect(searchBody.entries).toHaveLength(1);

    const exportRes = await app.request("/audit/export?tenantId=org-1&format=csv");
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get("content-type")).toContain("text/csv");
  });

  it("hasAuditCapability reflects registration", () => {
    resetAuditRuntimeForTests();
    expect(hasAuditCapability()).toBe(false);
    registerAuditRuntime(createAuditService({ store: createMemoryAuditStore() }));
    expect(hasAuditCapability()).toBe(true);
    resetAuditRuntimeForTests();
  });
});
