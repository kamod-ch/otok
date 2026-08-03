import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { DeadLetterRecord, IdempotencyStore, OutboxStore } from "../../types.js";
import {
  DEAD_LETTER_TABLE,
  OUTBOX_TABLE,
  PROCESSED_TABLE,
  POSTGRES_MIGRATION,
  SQLITE_MIGRATION,
  parseOutboxMetadata,
  parseOutboxPayload,
  serializeOutboxMetadata,
  serializeOutboxPayload,
  toOutboxRecord,
  type EventsDatabase,
  type EventsDialect,
} from "../types.js";

export {
  DEAD_LETTER_TABLE,
  OUTBOX_TABLE,
  PROCESSED_TABLE,
  SQLITE_MIGRATION,
  POSTGRES_MIGRATION,
} from "../types.js";
export type { EventsDatabase, EventsDialect } from "../types.js";

type OutboxRow = EventsDatabase[typeof OUTBOX_TABLE];
type DeadLetterRow = EventsDatabase[typeof DEAD_LETTER_TABLE];

export function createKyselyOutboxStore(
  db: Kysely<EventsDatabase>,
  dialect: EventsDialect = "sqlite",
): OutboxStore {
  const useJson = dialect === "postgres";

  return {
    async insert(record) {
      await db
        .insertInto(OUTBOX_TABLE)
        .values({
          id: record.id,
          event_name: record.eventName,
          event_version: record.eventVersion,
          payload: (useJson ? record.payload : serializeOutboxPayload(record.payload)) as OutboxRow["payload"],
          metadata: (useJson ? record.metadata : serializeOutboxMetadata(record.metadata)) as OutboxRow["metadata"],
          status: "pending",
          attempts: 0,
          available_at: record.availableAt,
          created_at: record.createdAt,
          processed_at: null,
          last_error: null,
          idempotency_key: record.idempotencyKey ?? null,
        })
        .execute();
    },

    async claimPending(limit, now = new Date()) {
      const rows = await db
        .selectFrom(OUTBOX_TABLE)
        .selectAll()
        .where("status", "=", "pending")
        .where("available_at", "<=", now.toISOString())
        .orderBy("created_at asc")
        .limit(limit)
        .execute();

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];

      await db.updateTable(OUTBOX_TABLE).set({ status: "processing" }).where("id", "in", ids).execute();

      for (const id of ids) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;
        await db
          .updateTable(OUTBOX_TABLE)
          .set({ attempts: row.attempts + 1 })
          .where("id", "=", id)
          .execute();
      }

      return rows.map((row) => {
        const payload =
          typeof row.payload === "string" ? parseOutboxPayload(row.payload) : row.payload;
        const metadata =
          typeof row.metadata === "string" ? parseOutboxMetadata(row.metadata) : row.metadata;
        return toOutboxRecord({
          ...row,
          status: row.status as import("../../types.js").OutboxStatus,
          payload: typeof payload === "string" ? payload : serializeOutboxPayload(payload),
          metadata: typeof metadata === "string" ? metadata : serializeOutboxMetadata(metadata),
        });
      });
    },

    async markPublished(id, processedAt) {
      await db
        .updateTable(OUTBOX_TABLE)
        .set({
          status: "published",
          processed_at: processedAt ?? new Date().toISOString(),
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id, error, availableAt) {
      await db
        .updateTable(OUTBOX_TABLE)
        .set({
          status: "pending",
          last_error: error,
          available_at: availableAt,
        })
        .where("id", "=", id)
        .execute();
    },

    async markDead(id, error) {
      await db
        .updateTable(OUTBOX_TABLE)
        .set({ status: "dead", last_error: error })
        .where("id", "=", id)
        .execute();
    },
  };
}

export function createKyselyIdempotencyStore(db: Kysely<EventsDatabase>): IdempotencyStore {
  return {
    async hasProcessed(consumerName, idempotencyKey) {
      const row = await db
        .selectFrom(PROCESSED_TABLE)
        .select("consumer_name")
        .where("consumer_name", "=", consumerName)
        .where("idempotency_key", "=", idempotencyKey)
        .executeTakeFirst();
      return Boolean(row);
    },

    async markProcessed(consumerName, idempotencyKey, processedAt) {
      await db
        .insertInto(PROCESSED_TABLE)
        .values({
          consumer_name: consumerName,
          idempotency_key: idempotencyKey,
          processed_at: processedAt ?? new Date().toISOString(),
        })
        .onConflict((oc) => oc.columns(["consumer_name", "idempotency_key"]).doNothing())
        .execute();
    },
  };
}

export function createKyselyDeadLetterStore(
  db: Kysely<EventsDatabase>,
  dialect: EventsDialect = "sqlite",
): { append(record: DeadLetterRecord): Promise<void>; list(limit?: number): Promise<DeadLetterRecord[]> } {
  const useJson = dialect === "postgres";

  return {
    async append(record) {
      await db
        .insertInto(DEAD_LETTER_TABLE)
        .values({
          id: record.id,
          event_name: record.eventName,
          event_version: record.eventVersion,
          payload: (useJson ? record.payload : serializeOutboxPayload(record.payload)) as DeadLetterRow["payload"],
          metadata: (useJson ? record.metadata : serializeOutboxMetadata(record.metadata)) as DeadLetterRow["metadata"],
          error: record.error,
          failed_at: record.failedAt,
          attempts: record.attempts,
        })
        .execute();
    },

    async list(limit = 100) {
      const rows = await db
        .selectFrom(DEAD_LETTER_TABLE)
        .selectAll()
        .orderBy("failed_at desc")
        .limit(limit)
        .execute();

      return rows.map((r) => ({
        id: r.id,
        eventName: r.event_name,
        eventVersion: r.event_version,
        payload: typeof r.payload === "string" ? parseOutboxPayload(r.payload) : r.payload,
        metadata: typeof r.metadata === "string" ? parseOutboxMetadata(r.metadata) : r.metadata,
        error: r.error,
        failedAt: r.failed_at,
        attempts: r.attempts,
      }));
    },
  };
}

export async function migrateEventsSchema(
  db: Kysely<EventsDatabase>,
  dialect: EventsDialect,
): Promise<void> {
  const migration = dialect === "postgres" ? POSTGRES_MIGRATION : SQLITE_MIGRATION;
  for (const statement of migration.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
}
