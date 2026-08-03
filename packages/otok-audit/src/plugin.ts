import { definePlugin } from "otok";
import type { Hono } from "hono";
import { AuditService } from "./audit.js";
import { registerAuditRuntime } from "./registry.js";
import { createMemoryAuditStore } from "./providers/memory.js";
import type { AuditPluginOptions, AuditProviderConfig } from "./types.js";

export function createAuditStore(config: AuditProviderConfig = { type: "memory" }) {
  switch (config.type) {
    case "memory":
      return createMemoryAuditStore();
    case "custom":
      return config.store;
    default:
      return createMemoryAuditStore();
  }
}

export function configureAuditApp(app: Hono, options: AuditPluginOptions): AuditService {
  const store = createAuditStore(options.provider);
  const service = new AuditService({
    store,
    defaultTenantId: options.defaultTenantId,
    redactFields: options.redactFields,
  });

  registerAuditRuntime(service);

  const searchPath = options.searchPath ?? "/audit/search";
  const exportPath = options.exportPath ?? "/audit/export";

  app.get(searchPath, async (c) => {
    const tenantId = c.req.query("tenantId");
    if (!tenantId) {
      return c.json({ code: "INVALID_INPUT", message: "tenantId is required" }, 400);
    }
    const result = await service.search({
      tenantId,
      action: c.req.query("action") ?? undefined,
      resourceType: c.req.query("resourceType") ?? undefined,
      resourceId: c.req.query("resourceId") ?? undefined,
      actorId: c.req.query("actorId") ?? undefined,
      from: c.req.query("from") ?? undefined,
      to: c.req.query("to") ?? undefined,
      q: c.req.query("q") ?? undefined,
      limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
      cursor: c.req.query("cursor") ?? undefined,
    });
    return c.json(result);
  });

  app.get(exportPath, async (c) => {
    const tenantId = c.req.query("tenantId");
    if (!tenantId) {
      return c.json({ code: "INVALID_INPUT", message: "tenantId is required" }, 400);
    }
    const format = c.req.query("format") === "csv" ? "csv" : "json";
    const body = await service.export(
      {
        tenantId,
        action: c.req.query("action") ?? undefined,
        resourceType: c.req.query("resourceType") ?? undefined,
        from: c.req.query("from") ?? undefined,
        to: c.req.query("to") ?? undefined,
        limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
      },
      format,
    );
    const contentType = format === "csv" ? "text/csv" : "application/json";
    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `attachment; filename="audit-${tenantId}.${format}"`);
    return c.body(body);
  });

  return service;
}

const auditPluginFactory = definePlugin<AuditPluginOptions>({
  name: "@kamod-ch/otok-audit",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input != null && typeof input !== "object") {
        throw new Error("audit() options must be an object");
      }
      return (input ?? {}) as AuditPluginOptions;
    },
  },
});

/**
 * Otok audit plugin — immutable audit trail with search and export routes.
 *
 * ```ts
 * import audit from "@kamod-ch/otok-audit/plugin";
 *
 * export default defineConfig({
 *   plugins: [audit({ defaultTenantId: "default" })],
 * });
 * ```
 */
export default function auditPlugin(options: AuditPluginOptions = {}) {
  const plugin = auditPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureAuditApp(app, options);
  };
  return plugin;
}

export type { AuditPluginOptions, AuditProviderConfig };
