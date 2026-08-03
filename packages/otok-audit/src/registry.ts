import { AuditService } from "./audit.js";
import type { AuditSearchQuery, AuditStore, RecordAuditInput } from "./types.js";

let runtime: AuditService | null = null;

export function registerAuditRuntime(service: AuditService): void {
  runtime = service;
}

export function getAuditRuntime(): AuditService {
  if (!runtime) {
    throw new Error(
      "otok-audit: not registered. Add audit() to otok.config.ts or call registerAuditRuntime().",
    );
  }
  return runtime;
}

export function tryGetAuditRuntime(): AuditService | null {
  return runtime;
}

export function hasAuditCapability(): boolean {
  return runtime != null;
}

export function resetAuditRuntimeForTests(): void {
  runtime = null;
}

export function createAuditService(options: { store: AuditStore; defaultTenantId?: string; redactFields?: readonly string[] }) {
  return new AuditService(options);
}

/** Typed helpers — uses registered runtime. */
export const audit = {
  record(input: RecordAuditInput) {
    return getAuditRuntime().record(input);
  },
  search(query: AuditSearchQuery) {
    return getAuditRuntime().search(query);
  },
  export(query: AuditSearchQuery, format: "json" | "csv") {
    return getAuditRuntime().export(query, format);
  },
  getById(id: string, tenantId: string) {
    return getAuditRuntime().getById(id, tenantId);
  },
};
