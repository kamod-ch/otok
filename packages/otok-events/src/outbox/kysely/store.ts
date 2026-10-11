import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import type {
  ClaimedOutboxRecord,
  DeadLetterRecord,
  IdempotencyStore,
  LeasedOutboxStore,
  OutboxStore,
} from "../../types.js";
import { DEFAULT_OUTBOX_LEASE_MS, OutboxLeaseError } from "../../types.js";
import {
  DEAD_LETTER_TABLE,
  OUTBOX_TABLE,
  POSTGRES_LEASE_MIGRATION_STATEMENTS,
  POSTGRES_MIGRATION,
  PROCESSED_TABLE,
  SQLITE_LEASE_MIGRATION_STATEMENTS,
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
  SQLITE_LEASE_MIGRATION_STATEMENTS,
  POSTGRES_LEASE_MIGRATION_STATEMENTS,
} from "../types.js";
export type { EventsDatabase, EventsDialect } from "../types.js";

type OutboxRow = EventsDatabase[typeof OUTBOX_TABLE];
type DeadLetterRow = EventsDatabase[typeof DEAD_LETTER_TABLE];

function rowToClaimed(row: OutboxRow, leaseToken: string, leaseExpiresAt: string): ClaimedOutboxRecord {
  const payload = typeof row.payload === "string" ? parseOutboxPayload(row.payload) : row.payload;
  const metadata = typeof row.metadata === "string" ? parseOutboxMetadata(row.metadata) : row.metadata;
  const base = toOutboxRecord({
    ...row,
    status: row.status as import("../../types.js").OutboxStatus,
    payload: typeof payload === "string" ? payload : serializeOutboxPayload(payload),
    metadata: typeof metadata === "string" ? metadata : serializeOutboxMetadata(metadata),
  });
  return { ...base, leaseToken, leaseExpiresAt };
}

async function assertNoActiveLease(
  db: Kysely<EventsDatabase>,
  id: string,
  operation: string,
): Promise<void> {
  const row = await db
    .selectFrom(OUTBOX_TABLE)
    .select(["lease_token", "status"])
    .where("id", "=", id)
    .executeTakeFirst();
  if (row?.status === "processing" && row.lease_token) {
    throw new OutboxLeaseError(`outbox ${operation}: active lease on ${id}; use leased store methods`);
  }
}

export function createKyselyOutboxStore(
  db: Kysely<EventsDatabase>,
  dialect: EventsDialect = "sqlite",
): OutboxStore & LeasedOutboxStore {
  const useJson = dialect === "postgres";

  const store: OutboxStore & LeasedOutboxStore = {
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
          lease_token: null,
          lease_expires_at: null,
        })
        .execute();
    },

    async claimPending() {
      throw new Error(
        "Kysely outbox: claimPending is not safe for concurrent workers. Use claimLeased() (OutboxProcessor uses it automatically).",
      );
    },

    async claimLeased(limit, now = new Date(), leaseMs = DEFAULT_OUTBOX_LEASE_MS) {
      const nowIso = now.toISOString();
      const expiresIso = new Date(now.getTime() + leaseMs).toISOString();

      if (dialect === "postgres") {
        const result = await sql<OutboxRow>`
          WITH picked AS (
            SELECT id
            FROM ${sql.table(OUTBOX_TABLE)}
            WHERE (
              (status = 'pending' AND available_at <= ${nowIso}::timestamptz)
              OR (
                status = 'processing'
                AND lease_expires_at IS NOT NULL
                AND lease_expires_at <= ${nowIso}::timestamptz
              )
            )
            ORDER BY created_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE ${sql.table(OUTBOX_TABLE)} AS o
          SET
            status = 'processing',
            attempts = o.attempts + 1,
            lease_token = gen_random_uuid()::text,
            lease_expires_at = ${expiresIso}::timestamptz
          FROM picked
          WHERE o.id = picked.id
          RETURNING o.*
        `.execute(db);

        return result.rows.map((row) =>
          rowToClaimed(row, row.lease_token as string, row.lease_expires_at as string),
        );
      }

      const claimed: ClaimedOutboxRecord[] = [];
      for (let i = 0; i < limit; i++) {
        const row = await db.transaction().execute(async (trx) => {
          const candidate = await trx
            .selectFrom(OUTBOX_TABLE)
            .select("id")
            .where((eb) =>
              eb.or([
                eb.and([eb("status", "=", "pending"), eb("available_at", "<=", nowIso)]),
                eb.and([
                  eb("status", "=", "processing"),
                  eb("lease_expires_at", "is not", null),
                  eb("lease_expires_at", "<=", nowIso),
                ]),
              ]),
            )
            .orderBy("created_at", "asc")
            .limit(1)
            .executeTakeFirst();

          if (!candidate) return undefined;

          const token = randomUUID();
          const updated = await trx
            .updateTable(OUTBOX_TABLE)
            .set((eb) => ({
              status: "processing",
              attempts: eb("attempts", "+", 1),
              lease_token: token,
              lease_expires_at: expiresIso,
            }))
            .where("id", "=", candidate.id)
            .where((eb) =>
              eb.or([
                eb.and([eb("status", "=", "pending"), eb("available_at", "<=", nowIso)]),
                eb.and([
                  eb("status", "=", "processing"),
                  eb("lease_expires_at", "is not", null),
                  eb("lease_expires_at", "<=", nowIso),
                ]),
              ]),
            )
            .returningAll()
            .executeTakeFirst();

          if (!updated) return undefined;
          return rowToClaimed(updated, token, expiresIso);
        });
        if (!row) break;
        claimed.push(row);
      }
      return claimed;
    },

    async renewLease(id, leaseToken, leaseMs = DEFAULT_OUTBOX_LEASE_MS, now = new Date()) {
      const nowIso = now.toISOString();
      const expiresIso = new Date(now.getTime() + leaseMs).toISOString();
      const updated = await db
        .updateTable(OUTBOX_TABLE)
        .set({ lease_expires_at: expiresIso })
        .where("id", "=", id)
        .where("lease_token", "=", leaseToken)
        .where("status", "=", "processing")
        .where("lease_expires_at", ">", nowIso)
        .executeTakeFirst();
      return Number(updated.numUpdatedRows) > 0;
    },

    async markPublished(id, processedAt) {
      await assertNoActiveLease(db, id, "markPublished");
      await db
        .updateTable(OUTBOX_TABLE)
        .set({
          status: "published",
          processed_at: processedAt ?? new Date().toISOString(),
          lease_token: null,
          lease_expires_at: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markPublishedLeased(id, leaseToken, processedAt) {
      const result = await db
        .updateTable(OUTBOX_TABLE)
        .set({
          status: "published",
          processed_at: processedAt ?? new Date().toISOString(),
          lease_token: null,
          lease_expires_at: null,
        })
        .where("id", "=", id)
        .where("lease_token", "=", leaseToken)
        .where("status", "=", "processing")
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) === 0) {
        throw new OutboxLeaseError();
      }
    },

    async markFailed(id, error, availableAt) {
      await assertNoActiveLease(db, id, "markFailed");
      await db
        .updateTable(OUTBOX_TABLE)
        .set({
          status: "pending",
          last_error: error,
          available_at: availableAt,
          lease_token: null,
          lease_expires_at: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailedLeased(id, leaseToken, error, availableAt) {
      const result = await db
        .updateTable(OUTBOX_TABLE)
        .set({
          status: "pending",
          last_error: error,
          available_at: availableAt,
          lease_token: null,
          lease_expires_at: null,
        })
        .where("id", "=", id)
        .where("lease_token", "=", leaseToken)
        .where("status", "=", "processing")
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) === 0) {
        throw new OutboxLeaseError();
      }
    },

    async markDead(id, error) {
      await assertNoActiveLease(db, id, "markDead");
      await db
        .updateTable(OUTBOX_TABLE)
        .set({ status: "dead", last_error: error, lease_token: null, lease_expires_at: null })
        .where("id", "=", id)
        .execute();
    },

    async markDeadLeased(id, leaseToken, error) {
      const result = await db
        .updateTable(OUTBOX_TABLE)
        .set({ status: "dead", last_error: error, lease_token: null, lease_expires_at: null })
        .where("id", "=", id)
        .where("lease_token", "=", leaseToken)
        .where("status", "=", "processing")
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) === 0) {
        throw new OutboxLeaseError();
      }
    },
  };

  return store;
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
      const rows = await db.selectFrom(DEAD_LETTER_TABLE).selectAll().orderBy("failed_at desc").limit(limit).execute();

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

async function runLeaseMigrationStatements(db: Kysely<EventsDatabase>, dialect: EventsDialect): Promise<void> {
  const statements = dialect === "postgres" ? POSTGRES_LEASE_MIGRATION_STATEMENTS : SQLITE_LEASE_MIGRATION_STATEMENTS;
  for (const statement of statements) {
    try {
      await sql.raw(statement).execute(db);
    } catch (error) {
      if (dialect === "sqlite" && error instanceof Error && /duplicate column/i.test(error.message)) {
        continue;
      }
      throw error;
    }
  }
}

export async function migrateEventsSchema(db: Kysely<EventsDatabase>, dialect: EventsDialect): Promise<void> {
  const migration = dialect === "postgres" ? POSTGRES_MIGRATION : SQLITE_MIGRATION;
  for (const statement of migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
  await runLeaseMigrationStatements(db, dialect);
}
