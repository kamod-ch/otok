import type { ZodType } from "zod";

export interface AuditActor {
  id: string;
  type: "user" | "system" | "api_key" | "service" | (string & {});
  email?: string;
  name?: string;
}

export interface AuditResource {
  type: string;
  id: string;
  name?: string;
}

export interface AuditFieldChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditSnapshotChange {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export type AuditChanges = AuditFieldChange[] | AuditSnapshotChange;

export interface AuditEntry {
  id: string;
  tenantId: string;
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  changes?: AuditChanges;
  occurredAt: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordAuditInput {
  tenantId?: string;
  actor?: AuditActor;
  action: string;
  resource: AuditResource;
  changes?: AuditChanges;
  occurredAt?: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditSearchQuery {
  tenantId: string;
  action?: string | readonly string[];
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditSearchResult {
  entries: AuditEntry[];
  nextCursor?: string;
  total?: number;
}

export interface AuditExportOptions {
  format: "json" | "csv";
  redactFields?: readonly string[];
}

/** Append-only store — no update or delete operations. */
export interface AuditStore {
  append(entry: AuditEntry): Promise<void>;
  getById(id: string, tenantId: string): Promise<AuditEntry | null>;
  search(query: AuditSearchQuery): Promise<AuditSearchResult>;
}

export interface AuditServiceOptions {
  store: AuditStore;
  defaultTenantId?: string;
  redactFields?: readonly string[];
  now?: () => Date;
}

export interface AuditContext {
  tenantId?: string;
  actor?: AuditActor;
  requestId?: string;
  correlationId?: string;
}

export interface AuditActionDefinition<TMetadata = unknown> {
  readonly __kind: "otok-audit-action";
  readonly name: string;
  readonly resourceType: string;
  readonly metadataSchema?: ZodType<TMetadata>;
  readonly redactFields?: readonly string[];
}

export interface AuditPluginOptions {
  provider?: AuditProviderConfig;
  defaultTenantId?: string;
  redactFields?: readonly string[];
  searchPath?: string;
  exportPath?: string;
}

export type AuditProviderConfig =
  | { type: "memory" }
  | { type: "custom"; store: AuditStore };

export function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function parseJson<T = unknown>(raw: string): T {
  return JSON.parse(raw) as T;
}

export function isSnapshotChange(changes: AuditChanges): changes is AuditSnapshotChange {
  return !Array.isArray(changes);
}

export function normalizeChanges(changes?: AuditChanges): AuditFieldChange[] {
  if (!changes) return [];
  if (Array.isArray(changes)) return changes;
  const fields = new Set([
    ...Object.keys(changes.before ?? {}),
    ...Object.keys(changes.after ?? {}),
  ]);
  return [...fields].map((field) => ({
    field,
    before: changes.before?.[field],
    after: changes.after?.[field],
  }));
}
