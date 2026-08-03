import { describe, expect, it } from "vitest";
import { AuditService } from "./audit.js";
import { withAuditActor, withAuditContext, withAuditTenant, getAuditContext } from "./context.js";
import { createMemoryAuditStore } from "./providers/memory.js";
import { companyUpdated } from "./crm/actions.js";

describe("AuditService", () => {
  it("records actor, action, resource, and changes", async () => {
    const service = new AuditService({ store: createMemoryAuditStore() });

    const entry = await service.record({
      tenantId: "org-1",
      actor: { id: "user-1", type: "user", email: "admin@example.com" },
      action: "company.updated",
      resource: { type: "company", id: "acme", name: "Acme Corp" },
      changes: { before: { name: "Acme" }, after: { name: "Acme Corp" } },
    });

    expect(entry.tenantId).toBe("org-1");
    expect(entry.action).toBe("company.updated");
    expect(entry.resource.id).toBe("acme");
    expect(entry.occurredAt).toBeTruthy();
  });

  it("uses audit context for tenant and actor", async () => {
    const service = new AuditService({ store: createMemoryAuditStore(), defaultTenantId: "fallback" });

    await withAuditTenant("tenant-ctx", () =>
      withAuditActor({ id: "u-1", type: "user" }, async () => {
        const entry = await service.record({
          action: "contact.created",
          resource: { type: "contact", id: "c-1" },
        });
        expect(entry.tenantId).toBe("tenant-ctx");
        expect(entry.actor.id).toBe("u-1");
      }),
    );
  });

  it("records typed audit actions", async () => {
    const service = new AuditService({ store: createMemoryAuditStore() });
    const entry = await service.recordAction(companyUpdated, {
      tenantId: "org-1",
      actor: { id: "u-1", type: "user" },
      resource: { type: "company", id: "acme" },
      changes: [{ field: "name", before: "A", after: "B" }],
    });
    expect(entry.action).toBe("company.updated");
    expect(entry.resource.type).toBe("company");
  });

  it("is append-only — duplicate ids are rejected by memory store", async () => {
    const store = createMemoryAuditStore();
    const service = new AuditService({ store });
    const entry = await service.record({
      tenantId: "t1",
      action: "test",
      resource: { type: "x", id: "1" },
    });
    await expect(
      store.append({ ...entry, action: "mutated" }),
    ).rejects.toThrow("append-only");
  });

  it("searches by tenant, action, and resource", async () => {
    const service = new AuditService({ store: createMemoryAuditStore() });
    await service.record({
      tenantId: "org-1",
      action: "company.created",
      resource: { type: "company", id: "a" },
    });
    await service.record({
      tenantId: "org-1",
      action: "company.updated",
      resource: { type: "company", id: "a" },
    });
    await service.record({
      tenantId: "org-2",
      action: "company.created",
      resource: { type: "company", id: "b" },
    });

    const result = await service.search({
      tenantId: "org-1",
      action: "company.updated",
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.action).toBe("company.updated");
  });

  it("redacts sensitive fields in search results", async () => {
    const service = new AuditService({
      store: createMemoryAuditStore(),
      redactFields: ["email", "taxId"],
    });

    await service.record({
      tenantId: "org-1",
      actor: { id: "u-1", type: "user", email: "secret@example.com" },
      action: "company.updated",
      resource: { type: "company", id: "a" },
      changes: { before: { taxId: "DE123" }, after: { taxId: "DE456" } },
    });

    const { entries } = await service.search({ tenantId: "org-1" });
    expect(entries[0]?.actor).toMatchObject({ email: "[REDACTED]" });
    expect(entries[0]?.changes).toMatchObject({
      before: { taxId: "[REDACTED]" },
    });
  });

  it("exports JSON and CSV", async () => {
    const service = new AuditService({ store: createMemoryAuditStore() });
    await service.record({
      tenantId: "org-1",
      action: "company.created",
      resource: { type: "company", id: "a" },
    });

    const json = await service.export({ tenantId: "org-1" }, "json");
    const csv = await service.export({ tenantId: "org-1" }, "csv");
    expect(JSON.parse(json)).toHaveLength(1);
    expect(csv).toContain("company.created");
    expect(csv).toContain("tenantId");
  });
});

describe("audit context", () => {
  it("propagates request id through nested context", () => {
    withAuditContext({ requestId: "req-1", correlationId: "corr-1" }, () => {
      withAuditActor({ id: "u-1", type: "user" }, () => {
        const ctx = getAuditContext();
        expect(ctx?.requestId).toBe("req-1");
        expect(ctx?.correlationId).toBe("corr-1");
        expect(ctx?.actor?.id).toBe("u-1");
      });
    });
  });
});
