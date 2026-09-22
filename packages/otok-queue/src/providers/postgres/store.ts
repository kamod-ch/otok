import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import { OtokQueueJobError } from "../../errors.js";
import type {
  ClaimOptions,
  CronSchedule,
  EnqueueOptions,
  JobPayloadMap,
  PostgresProviderConfig,
  QueueJob,
  QueueProvider,
  QueueProviderCapabilities,
  QueueRetryDefaults,
} from "../../types.js";
import { computeBackoffWithJitter, cronMatches } from "../../utils.js";
import { CRON_DEDUPE_TABLE, DEAD_LETTER_TABLE, JOBS_TABLE, type QueueDatabase, type QueueJobsTable } from "./schema.js";

export interface PostgresQueueProviderOptions extends PostgresProviderConfig {
  retry: QueueRetryDefaults;
}

function rowToJob(row: QueueJobsTable): QueueJob {
  return {
    id: row.id,
    name: row.name,
    payload: row.payload,
    status: row.status as QueueJob["status"],
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    idempotencyKey: row.idempotency_key ?? undefined,
    idempotencyScope: row.idempotency_scope ?? undefined,
    createdAt: row.created_at.toISOString(),
    availableAt: row.available_at.toISOString(),
    lastError: row.last_error ?? undefined,
    leaseToken: row.lease_token ?? undefined,
    leaseOwner: row.lease_owner ?? undefined,
    leaseUntil: row.lease_until?.toISOString(),
  };
}

export function createPostgresQueueProvider<TJobs extends JobPayloadMap = JobPayloadMap>(
  db: Kysely<QueueDatabase>,
  options: PostgresQueueProviderOptions,
): QueueProvider<TJobs> {
  const leaseMs = options.leaseMs ?? 30_000;
  const dedupeRetentionMs = options.dedupeRetentionMs ?? 7 * 86_400_000;
  const deadLetterRetentionMs = options.deadLetterRetentionMs ?? 30 * 86_400_000;
  const defaultScope = options.defaultIdempotencyScope ?? "default";
  const cronSchedules: CronSchedule[] = [];

  const capabilities: QueueProviderCapabilities = {
    delayedJobs: true,
    cronJobs: true,
    idempotency: true,
    deadLetter: true,
    persistence: true,
  };

  async function releaseExpiredLeases(): Promise<void> {
    await sql`
      UPDATE otok_queue_jobs
      SET status = 'pending', lease_owner = NULL, lease_token = NULL, lease_until = NULL
      WHERE status = 'processing' AND lease_until IS NOT NULL AND lease_until < NOW()
    `.execute(db);
  }

  const provider: QueueProvider<TJobs> = {
    name: "postgres",
    capabilities,

    async enqueue(name, payload, enqueueOptions: EnqueueOptions = {}) {
      const now = new Date();
      const availableAt = enqueueOptions.runAt ?? new Date(now.getTime() + (enqueueOptions.delayMs ?? 0));
      const scope = enqueueOptions.idempotencyKey ? (enqueueOptions.idempotencyScope ?? defaultScope) : null;

      if (enqueueOptions.idempotencyKey && scope) {
        const existing = await db
          .selectFrom(JOBS_TABLE)
          .selectAll()
          .where("idempotency_scope", "=", scope)
          .where("idempotency_key", "=", enqueueOptions.idempotencyKey)
          .where("status", "in", ["pending", "processing"])
          .executeTakeFirst();
        if (existing) return rowToJob(existing) as QueueJob<typeof name, TJobs[typeof name]>;
      }

      const id = randomUUID();
      const row = {
        id,
        name,
        payload: payload as unknown,
        status: "pending",
        attempts: 0,
        max_attempts: enqueueOptions.maxAttempts ?? options.retry.maxAttempts,
        idempotency_scope: scope,
        idempotency_key: enqueueOptions.idempotencyKey ?? null,
        created_at: now,
        available_at: availableAt,
        lease_owner: null,
        lease_token: null,
        lease_until: null,
        last_error: null,
      };
      await db.insertInto(JOBS_TABLE).values(row).execute();
      return rowToJob(row as QueueJobsTable) as QueueJob<typeof name, TJobs[typeof name]>;
    },

    async claim(limit = 10, claimOptions: ClaimOptions = {}) {
      await releaseExpiredLeases();
      const workerId = claimOptions.workerId ?? "worker";
      const token = randomUUID();
      const until = new Date(Date.now() + (claimOptions.leaseMs ?? leaseMs));

      const result = await sql<QueueJobsTable>`
        UPDATE otok_queue_jobs AS j
        SET
          status = 'processing',
          attempts = j.attempts + 1,
          lease_owner = ${workerId},
          lease_token = ${token}::uuid,
          lease_until = ${until}
        FROM (
          SELECT id FROM otok_queue_jobs
          WHERE status = 'pending' AND available_at <= NOW()
          ORDER BY available_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        ) AS picked
        WHERE j.id = picked.id
        RETURNING j.*
      `.execute(db);

      return (result.rows as QueueJobsTable[]).map(rowToJob);
    },

    async complete(jobId, leaseToken) {
      const deleted = await db
        .deleteFrom(JOBS_TABLE)
        .where("id", "=", jobId)
        .where("lease_token", "=", leaseToken ?? null)
        .where("status", "=", "processing")
        .executeTakeFirst();
      if (!deleted.numDeletedRows || deleted.numDeletedRows === 0n) {
        throw new OtokQueueJobError(`lease lost or job not found: ${jobId}`);
      }
    },

    async heartbeat(jobId, leaseToken) {
      const until = new Date(Date.now() + leaseMs);
      const updated = await db
        .updateTable(JOBS_TABLE)
        .set({ lease_until: until })
        .where("id", "=", jobId)
        .where("lease_token", "=", leaseToken)
        .where("status", "=", "processing")
        .executeTakeFirst();
      return updated.numUpdatedRows > 0n;
    },

    async fail(jobId, error, retryable = true, leaseToken) {
      const row = await db
        .selectFrom(JOBS_TABLE)
        .selectAll()
        .where("id", "=", jobId)
        .where("lease_token", "=", leaseToken ?? null)
        .where("status", "=", "processing")
        .executeTakeFirst();
      if (!row) throw new OtokQueueJobError(`lease lost or job not found: ${jobId}`);

      if (!retryable || row.attempts >= row.max_attempts) {
        await provider.moveToDeadLetter!(jobId, error, leaseToken);
        return;
      }

      const delayMs = computeBackoffWithJitter(
        row.attempts,
        options.retry.initialBackoffMs,
        options.retry.maxBackoffMs,
      );
      const availableAt = new Date(Date.now() + delayMs);
      await db
        .updateTable(JOBS_TABLE)
        .set({
          status: "pending",
          available_at: availableAt,
          last_error: error,
          lease_owner: null,
          lease_token: null,
          lease_until: null,
        })
        .where("id", "=", jobId)
        .where("lease_token", "=", leaseToken ?? null)
        .execute();
    },

    async moveToDeadLetter(jobId, error, leaseToken) {
      const row = await db
        .selectFrom(JOBS_TABLE)
        .selectAll()
        .where("id", "=", jobId)
        .where("lease_token", "=", leaseToken ?? null)
        .where("status", "=", "processing")
        .executeTakeFirst();
      if (!row) throw new OtokQueueJobError(`lease lost or job not found: ${jobId}`);

      const now = new Date();
      await db
        .insertInto(DEAD_LETTER_TABLE)
        .values({
          id: randomUUID(),
          job_id: row.id,
          name: row.name,
          payload: row.payload,
          attempts: row.attempts,
          error,
          failed_at: now,
          retain_until: new Date(now.getTime() + deadLetterRetentionMs),
        })
        .execute();
      await db.deleteFrom(JOBS_TABLE).where("id", "=", jobId).execute();
    },

    async retryDeadLetter(deadLetterId) {
      const dl = await db.selectFrom(DEAD_LETTER_TABLE).selectAll().where("id", "=", deadLetterId).executeTakeFirst();
      if (!dl) throw new OtokQueueJobError(`dead letter not found: ${deadLetterId}`);
      return provider.enqueue(dl.name as keyof TJobs & string, dl.payload as TJobs[keyof TJobs & string], {
        maxAttempts: options.retry.maxAttempts,
      });
    },

    async findByIdempotencyKey(key) {
      const row = await db
        .selectFrom(JOBS_TABLE)
        .selectAll()
        .where("idempotency_key", "=", key)
        .where("status", "in", ["pending", "processing"])
        .executeTakeFirst();
      return row ? rowToJob(row) : null;
    },

    async registerCron(schedule) {
      cronSchedules.push(schedule);
    },

    async tickCron(now = new Date()) {
      const enqueued: QueueJob[] = [];
      for (const schedule of cronSchedules) {
        if (!cronMatches(schedule.cron, now)) continue;
        const fireAt = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()),
        );
        const inserted = await db
          .insertInto(CRON_DEDUPE_TABLE)
          .values({
            schedule_name: schedule.name,
            fire_at_utc: fireAt,
            created_at: new Date(),
          })
          .onConflict((oc) => oc.columns(["schedule_name", "fire_at_utc"]).doNothing())
          .returning("schedule_name")
          .executeTakeFirst();
        if (!inserted) continue;
        const job = await provider.enqueue(
          schedule.jobName as keyof TJobs & string,
          schedule.payload as TJobs[keyof TJobs & string],
          { idempotencyKey: `${schedule.name}:${fireAt.toISOString()}`, idempotencyScope: "cron" },
        );
        enqueued.push(job);
      }
      return enqueued;
    },
  };

  void dedupeRetentionMs;
  return provider;
}
