import type { Kysely } from "kysely";
import { sql } from "kysely";
import { deserializeIdempotencyResponse } from "./serialize.js";
import type { IdempotencyBeginResult, IdempotencyStore, SerializedIdempotencyResponse } from "./types.js";
import { IDEMPOTENCY_WAIT_MS } from "./types.js";

export const IDEMPOTENCY_RECORDS_TABLE = "otok_idempotency_records";

export interface IdempotencyDatabase {
  [IDEMPOTENCY_RECORDS_TABLE]: {
    storage_key: string;
    fingerprint: string;
    state: string;
    response_body: Buffer | null;
    response_meta: { status: number; statusText: string; headers: Array<[string, string]> } | null;
    expires_at: Date;
    updated_at: Date;
  };
}

export interface PostgresIdempotencyStoreOptions {
  waitMs?: number;
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  readonly name = "postgres";
  readonly durability = "durable" as const;
  private readonly waitMs: number;

  constructor(
    private readonly db: Kysely<IdempotencyDatabase>,
    options: PostgresIdempotencyStoreOptions = {},
  ) {
    this.waitMs = options.waitMs ?? IDEMPOTENCY_WAIT_MS;
  }

  private async prune(): Promise<void> {
    await sql`DELETE FROM otok_idempotency_records WHERE expires_at < NOW()`.execute(this.db);
  }

  async begin(storageKey: string, fingerprint: string, ttlMs: number): Promise<IdempotencyBeginResult> {
    await this.prune();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    const existing = await this.db
      .selectFrom(IDEMPOTENCY_RECORDS_TABLE)
      .selectAll()
      .where("storage_key", "=", storageKey)
      .where("expires_at", ">", now)
      .executeTakeFirst();

    if (existing) {
      if (existing.fingerprint !== fingerprint) return { kind: "conflict" };
      if (
        (existing.state === "completed" || existing.state === "error") &&
        existing.response_body &&
        existing.response_meta
      ) {
        const stored: SerializedIdempotencyResponse = {
          status: existing.response_meta.status,
          statusText: existing.response_meta.statusText,
          headers: existing.response_meta.headers,
          body: new Uint8Array(existing.response_body),
          retryable: existing.state === "error",
        };
        return { kind: "replay", response: deserializeIdempotencyResponse(stored) };
      }
      if (existing.state === "pending") return { kind: "wait" };
    }

    await this.db
      .insertInto(IDEMPOTENCY_RECORDS_TABLE)
      .values({
        storage_key: storageKey,
        fingerprint,
        state: "pending",
        response_body: null,
        response_meta: null,
        expires_at: expiresAt,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column("storage_key").doUpdateSet({
          fingerprint,
          state: "pending",
          response_body: null,
          response_meta: null,
          expires_at: expiresAt,
          updated_at: now,
        }),
      )
      .execute();

    const after = await this.db
      .selectFrom(IDEMPOTENCY_RECORDS_TABLE)
      .selectAll()
      .where("storage_key", "=", storageKey)
      .executeTakeFirst();
    if (after && after.fingerprint !== fingerprint) return { kind: "conflict" };
    if (after?.state === "pending" && after.updated_at.getTime() > now.getTime() - 50) {
      return { kind: "leader" };
    }
    return { kind: "wait" };
  }

  async complete(
    storageKey: string,
    fingerprint: string,
    response: SerializedIdempotencyResponse,
    ttlMs: number,
  ): Promise<void> {
    await this.persistResponse(storageKey, fingerprint, response, ttlMs, "completed");
  }

  async fail(
    storageKey: string,
    fingerprint: string,
    response: SerializedIdempotencyResponse,
    ttlMs: number,
  ): Promise<void> {
    await this.persistResponse(storageKey, fingerprint, response, ttlMs, "error");
  }

  private async persistResponse(
    storageKey: string,
    fingerprint: string,
    response: SerializedIdempotencyResponse,
    ttlMs: number,
    state: "completed" | "error",
  ): Promise<void> {
    await this.db
      .updateTable(IDEMPOTENCY_RECORDS_TABLE)
      .set({
        state,
        response_body: Buffer.from(response.body),
        response_meta: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
        expires_at: new Date(Date.now() + ttlMs),
        updated_at: new Date(),
      })
      .where("storage_key", "=", storageKey)
      .where("fingerprint", "=", fingerprint)
      .execute();
  }

  async releasePending(storageKey: string, fingerprint: string): Promise<void> {
    await this.db
      .deleteFrom(IDEMPOTENCY_RECORDS_TABLE)
      .where("storage_key", "=", storageKey)
      .where("fingerprint", "=", fingerprint)
      .where("state", "=", "pending")
      .execute();
  }

  async waitForLeader(storageKey: string, fingerprint: string, timeoutMs = this.waitMs): Promise<Response> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const row = await this.db
        .selectFrom(IDEMPOTENCY_RECORDS_TABLE)
        .selectAll()
        .where("storage_key", "=", storageKey)
        .where("expires_at", ">", new Date())
        .executeTakeFirst();
      if (!row || row.fingerprint !== fingerprint) {
        throw new Error("[otok:idempotency] Missing record while waiting.");
      }
      if ((row.state === "completed" || row.state === "error") && row.response_body && row.response_meta) {
        return deserializeIdempotencyResponse({
          status: row.response_meta.status,
          statusText: row.response_meta.statusText,
          headers: row.response_meta.headers,
          body: new Uint8Array(row.response_body),
          retryable: row.state === "error",
        });
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("[otok:idempotency] Timed out waiting for idempotent action.");
  }
}
