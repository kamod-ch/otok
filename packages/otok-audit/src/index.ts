export { defineAuditAction, isAuditActionDefinition, z } from "./define-action.js";
export type { DefineAuditActionOptions } from "./define-action.js";

export type {
  AuditActor,
  AuditResource,
  AuditFieldChange,
  AuditSnapshotChange,
  AuditChanges,
  AuditEntry,
  RecordAuditInput,
  AuditSearchQuery,
  AuditSearchResult,
  AuditExportOptions,
  AuditStore,
  AuditServiceOptions,
  AuditContext,
  AuditActionDefinition,
  AuditPluginOptions,
  AuditProviderConfig,
} from "./types.js";

export { serializeJson, parseJson, isSnapshotChange, normalizeChanges } from "./types.js";

export { AuditService } from "./audit.js";
export { AuditException } from "./errors.js";
export { redactAuditEntry, redactAuditValue } from "./redaction.js";
export { exportAuditEntries } from "./export.js";

export {
  withAuditContext,
  getAuditContext,
  withAuditRequestId,
  withAuditActor,
  withAuditTenant,
  createCorrelationId,
} from "./context.js";

export { createMemoryAuditStore, MemoryAuditStore } from "./providers/memory.js";
export { createKyselyAuditStore, migrateAuditSchema } from "./providers/kysely/index.js";

export {
  audit,
  getAuditRuntime,
  tryGetAuditRuntime,
  hasAuditCapability,
  registerAuditRuntime,
  resetAuditRuntimeForTests,
  createAuditService,
} from "./registry.js";

export { companyCreated, companyUpdated, companyDeleted, crmAuditActions } from "./crm/index.js";

export { createAuditStore, configureAuditApp } from "./plugin.js";
