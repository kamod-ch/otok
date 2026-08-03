import { getAuditContext } from "./context.js";
import { redactAuditEntry } from "./redaction.js";
import type {
  AuditActionDefinition,
  AuditEntry,
  AuditServiceOptions,
  AuditSearchQuery,
  AuditSearchResult,
  AuditStore,
  RecordAuditInput,
} from "./types.js";
import { exportAuditEntries } from "./export.js";

export class AuditService {
  private readonly store: AuditStore;
  private readonly defaultTenantId?: string;
  private readonly redactFields?: readonly string[];
  private readonly now: () => Date;

  constructor(options: AuditServiceOptions) {
    this.store = options.store;
    this.defaultTenantId = options.defaultTenantId;
    this.redactFields = options.redactFields;
    this.now = options.now ?? (() => new Date());
  }

  async record(input: RecordAuditInput): Promise<AuditEntry> {
    const ctx = getAuditContext();
    const tenantId = input.tenantId ?? ctx?.tenantId ?? this.defaultTenantId;
    if (!tenantId) {
      throw new Error("otok-audit: tenantId is required (context, input, or defaultTenantId)");
    }

    const actor = input.actor ?? ctx?.actor ?? { id: "system", type: "system" as const };

    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      tenantId,
      actor,
      action: input.action,
      resource: input.resource,
      changes: input.changes,
      occurredAt: input.occurredAt ?? this.now().toISOString(),
      requestId: input.requestId ?? ctx?.requestId,
      correlationId: input.correlationId ?? ctx?.correlationId,
      metadata: input.metadata,
    };

    await this.store.append(entry);
    return redactAuditEntry(entry, this.redactFields);
  }

  async recordAction<TMetadata>(
    definition: AuditActionDefinition<TMetadata>,
    input: Omit<RecordAuditInput, "action"> & { metadata?: TMetadata },
  ): Promise<AuditEntry> {
    const fields = [...(this.redactFields ?? []), ...(definition.redactFields ?? [])];
    const entry = await this.record({
      ...input,
      action: definition.name,
      resource: {
        id: input.resource.id,
        name: input.resource.name,
        type: definition.resourceType,
      },
      metadata: input.metadata as Record<string, unknown> | undefined,
    });
    return redactAuditEntry(entry, fields);
  }

  async search(query: AuditSearchQuery): Promise<AuditSearchResult> {
    const result = await this.store.search(query);
    return {
      ...result,
      entries: result.entries.map((e) => redactAuditEntry(e, this.redactFields)),
    };
  }

  async getById(id: string, tenantId: string): Promise<AuditEntry | null> {
    const entry = await this.store.getById(id, tenantId);
    return entry ? redactAuditEntry(entry, this.redactFields) : null;
  }

  async export(query: AuditSearchQuery, format: "json" | "csv"): Promise<string> {
    const result = await this.search({ ...query, limit: query.limit ?? 10_000 });
    return exportAuditEntries(result.entries, { format, redactFields: this.redactFields });
  }
}
