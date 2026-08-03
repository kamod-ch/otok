import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { AuditEntry, AuditSearchQuery, AuditSearchResult, AuditStore } from "../../types.js";
import { parseJson, serializeJson } from "../../types.js";

export const AUDIT_TABLE = "audit_log";

export interface AuditDatabase {
  [AUDIT_TABLE]: {
    id: string;
    tenant_id: string;
    actor_id: string;
    actor: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name: string | null;
    changes: string | null;
    occurred_at: string;
    request_id: string | null;
    correlation_id: string | null;
    metadata: string | null;
  };
}

export type AuditDialect = "sqlite" | "postgres";

export const SQLITE_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${AUDIT_TABLE} (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  changes TEXT,
  occurred_at TEXT NOT NULL,
  request_id TEXT,
  correlation_id TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON ${AUDIT_TABLE}(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_action ON ${AUDIT_TABLE}(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_resource ON ${AUDIT_TABLE}(tenant_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_actor ON ${AUDIT_TABLE}(tenant_id, actor_id);
`;

export const POSTGRES_MIGRATION = SQLITE_MIGRATION;

function rowToEntry(row: AuditDatabase[typeof AUDIT_TABLE]): AuditEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actor: parseJson(row.actor),
    action: row.action,
    resource: {
      type: row.resource_type,
      id: row.resource_id,
      name: row.resource_name ?? undefined,
    },
    changes: row.changes ? parseJson(row.changes) : undefined,
    occurredAt: row.occurred_at,
    requestId: row.request_id ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    metadata: row.metadata ? parseJson(row.metadata) : undefined,
  };
}

export function createKyselyAuditStore(db: Kysely<AuditDatabase>): AuditStore {
  return {
    async append(entry: AuditEntry) {
      await db
        .insertInto(AUDIT_TABLE)
        .values({
          id: entry.id,
          tenant_id: entry.tenantId,
          actor_id: entry.actor.id,
          actor: serializeJson(entry.actor),
          action: entry.action,
          resource_type: entry.resource.type,
          resource_id: entry.resource.id,
          resource_name: entry.resource.name ?? null,
          changes: entry.changes != null ? serializeJson(entry.changes) : null,
          occurred_at: entry.occurredAt,
          request_id: entry.requestId ?? null,
          correlation_id: entry.correlationId ?? null,
          metadata: entry.metadata ? serializeJson(entry.metadata) : null,
        })
        .execute();
    },

    async getById(id: string, tenantId: string) {
      const row = await db
        .selectFrom(AUDIT_TABLE)
        .selectAll()
        .where("id", "=", id)
        .where("tenant_id", "=", tenantId)
        .executeTakeFirst();
      return row ? rowToEntry(row) : null;
    },

    async search(query: AuditSearchQuery): Promise<AuditSearchResult> {
      const limit = Math.min(query.limit ?? 50, 500);
      let q = db
        .selectFrom(AUDIT_TABLE)
        .selectAll()
        .where("tenant_id", "=", query.tenantId)
        .orderBy("occurred_at desc")
        .limit(limit + 1);

      if (query.action) {
        const actions = Array.isArray(query.action) ? [...query.action] : [query.action];
        q = q.where("action", "in", actions);
      }
      if (query.resourceType) q = q.where("resource_type", "=", query.resourceType);
      if (query.resourceId) q = q.where("resource_id", "=", query.resourceId);
      if (query.from) q = q.where("occurred_at", ">=", query.from);
      if (query.to) q = q.where("occurred_at", "<=", query.to);
      if (query.actorId) q = q.where("actor_id", "=", query.actorId);
      if (query.q) {
        const pattern = `%${query.q}%`;
        q = q.where((eb) =>
          eb.or([
            eb("action", "like", pattern),
            eb("resource_type", "like", pattern),
            eb("resource_id", "like", pattern),
          ]),
        );
      }
      if (query.cursor) {
        const cursorRow = await db
          .selectFrom(AUDIT_TABLE)
          .select("occurred_at")
          .where("id", "=", query.cursor)
          .executeTakeFirst();
        if (cursorRow) {
          q = q.where("occurred_at", "<", cursorRow.occurred_at);
        }
      }

      const rows = await q.execute();
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      return {
        entries: page.map(rowToEntry),
        nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
      };
    },
  };
}

export async function migrateAuditSchema(
  db: Kysely<AuditDatabase>,
  dialect: AuditDialect = "sqlite",
): Promise<void> {
  const migration = dialect === "postgres" ? POSTGRES_MIGRATION : SQLITE_MIGRATION;
  for (const statement of migration.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
}
