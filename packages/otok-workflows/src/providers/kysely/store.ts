import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import type {
  ClaimRunnableOptions,
  ClaimedWorkflowInstance,
  StepRecord,
  WorkflowDeadLetter,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowStore,
} from "../../types.js";
import { fromDbJson, toDbJson } from "../../types.js";

export const INSTANCES_TABLE = "workflow_instances";
export const STEPS_TABLE = "workflow_steps";
export const DEAD_LETTER_TABLE = "workflow_dead_letter";
export const CRON_DEDUPE_TABLE = "workflow_cron_dedupe";

export interface WorkflowsDatabase {
  [INSTANCES_TABLE]: {
    id: string;
    workflow_name: string;
    status: string;
    input: string | unknown;
    output: string | unknown | null;
    progress: number;
    current_step: string | null;
    idempotency_key: string | null;
    workflow_version: number;
    run_attempts: number;
    max_run_attempts: number;
    lease_owner: string | null;
    lease_token: string | null;
    lease_until: string | null;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    completed_at: string | null;
    error: string | null;
    request_id: string | null;
    metadata: string | unknown | null;
  };
  [STEPS_TABLE]: {
    instance_id: string;
    step_name: string;
    status: string;
    attempt: number;
    output: string | unknown | null;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    idempotency_key: string | null;
  };
  [DEAD_LETTER_TABLE]: {
    instance_id: string;
    workflow_name: string;
    error: string;
    failed_at: string;
    steps: string | unknown;
  };
  [CRON_DEDUPE_TABLE]: {
    schedule_name: string;
    fire_at_utc: string;
    created_at: string;
  };
}

export type WorkflowsDialect = "sqlite" | "postgres";

export const SQLITE_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${INSTANCES_TABLE} (
  id TEXT PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  idempotency_key TEXT UNIQUE,
  workflow_version INTEGER NOT NULL DEFAULT 1,
  run_attempts INTEGER NOT NULL DEFAULT 0,
  max_run_attempts INTEGER NOT NULL DEFAULT 3,
  lease_owner TEXT,
  lease_token TEXT,
  lease_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error TEXT,
  request_id TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_workflow_claim ON ${INSTANCES_TABLE}(status, updated_at);

CREATE TABLE IF NOT EXISTS ${STEPS_TABLE} (
  instance_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  output TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  idempotency_key TEXT,
  PRIMARY KEY (instance_id, step_name)
);

CREATE TABLE IF NOT EXISTS ${DEAD_LETTER_TABLE} (
  instance_id TEXT PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  error TEXT NOT NULL,
  failed_at TEXT NOT NULL,
  steps TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${CRON_DEDUPE_TABLE} (
  schedule_name TEXT NOT NULL,
  fire_at_utc TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (schedule_name, fire_at_utc)
);
`;

export const POSTGRES_MIGRATION = `
CREATE TABLE IF NOT EXISTS ${INSTANCES_TABLE} (
  id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  idempotency_key TEXT UNIQUE,
  workflow_version INTEGER NOT NULL DEFAULT 1,
  run_attempts INTEGER NOT NULL DEFAULT 0,
  max_run_attempts INTEGER NOT NULL DEFAULT 3,
  lease_owner TEXT,
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  request_id TEXT,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_workflow_claim ON ${INSTANCES_TABLE}(status, updated_at);

CREATE TABLE IF NOT EXISTS ${STEPS_TABLE} (
  instance_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  PRIMARY KEY (instance_id, step_name)
);

CREATE TABLE IF NOT EXISTS ${DEAD_LETTER_TABLE} (
  instance_id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  error TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL,
  steps JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS ${CRON_DEDUPE_TABLE} (
  schedule_name TEXT NOT NULL,
  fire_at_utc TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schedule_name, fire_at_utc)
);
`;

function rowToInstance(row: WorkflowsDatabase[typeof INSTANCES_TABLE]): WorkflowInstance {
  return {
    id: row.id,
    workflowName: row.workflow_name,
    status: row.status as WorkflowStatus,
    input: fromDbJson(row.input),
    output: row.output != null ? fromDbJson(row.output) : undefined,
    progress: row.progress,
    currentStep: row.current_step ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    workflowVersion: row.workflow_version,
    runAttempts: row.run_attempts,
    maxRunAttempts: row.max_run_attempts,
    leaseOwner: row.lease_owner ?? undefined,
    leaseToken: row.lease_token ?? undefined,
    leaseUntil: row.lease_until ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    error: row.error ?? undefined,
    requestId: row.request_id ?? undefined,
    metadata: row.metadata != null ? fromDbJson(row.metadata) : undefined,
  };
}

export interface KyselyWorkflowStoreOptions {
  dialect?: WorkflowsDialect;
  defaultLeaseMs?: number;
}

export function createKyselyWorkflowStore(
  db: Kysely<WorkflowsDatabase>,
  options: KyselyWorkflowStoreOptions = {},
): WorkflowStore {
  const dialect = options.dialect ?? "sqlite";
  const defaultLeaseMs = options.defaultLeaseMs ?? 30_000;

  async function releaseExpiredLeases(now: Date): Promise<void> {
    const nowIso = now.toISOString();
    if (dialect === "postgres") {
      await sql`
        UPDATE ${sql.table(INSTANCES_TABLE)}
        SET status = 'pending', lease_owner = NULL, lease_token = NULL, lease_until = NULL
        WHERE status = 'running' AND lease_until IS NOT NULL AND lease_until < ${now}
      `.execute(db);
    } else {
      await db
        .updateTable(INSTANCES_TABLE)
        .set({ status: "pending", lease_owner: null, lease_token: null, lease_until: null })
        .where("status", "=", "running")
        .where("lease_until", "is not", null)
        .where("lease_until", "<", nowIso)
        .execute();
    }
  }

  return {
    async createInstance(instance: WorkflowInstance) {
      await db
        .insertInto(INSTANCES_TABLE)
        .values({
          id: instance.id,
          workflow_name: instance.workflowName,
          status: instance.status,
          input: toDbJson(instance.input, dialect),
          output: instance.output != null ? toDbJson(instance.output, dialect) : null,
          progress: instance.progress,
          current_step: instance.currentStep ?? null,
          idempotency_key: instance.idempotencyKey ?? null,
          workflow_version: instance.workflowVersion ?? 1,
          run_attempts: instance.runAttempts ?? 0,
          max_run_attempts: instance.maxRunAttempts ?? 3,
          lease_owner: instance.leaseOwner ?? null,
          lease_token: instance.leaseToken ?? null,
          lease_until: instance.leaseUntil ?? null,
          created_at: instance.createdAt,
          updated_at: instance.updatedAt,
          started_at: instance.startedAt ?? null,
          completed_at: instance.completedAt ?? null,
          error: instance.error ?? null,
          request_id: instance.requestId ?? null,
          metadata: instance.metadata ? toDbJson(instance.metadata, dialect) : null,
        })
        .execute();
    },

    async getInstance(id: string) {
      const row = await db.selectFrom(INSTANCES_TABLE).selectAll().where("id", "=", id).executeTakeFirst();
      return row ? rowToInstance(row) : null;
    },

    async findByIdempotencyKey(key: string) {
      const row = await db
        .selectFrom(INSTANCES_TABLE)
        .selectAll()
        .where("idempotency_key", "=", key)
        .executeTakeFirst();
      return row ? rowToInstance(row) : null;
    },

    async updateInstance(id: string, patch: Partial<WorkflowInstance>) {
      const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status) values.status = patch.status;
      if (patch.output !== undefined) values.output = toDbJson(patch.output, dialect);
      if (patch.progress !== undefined) values.progress = patch.progress;
      if (patch.currentStep !== undefined) values.current_step = patch.currentStep;
      if (patch.error !== undefined) values.error = patch.error;
      if (patch.completedAt !== undefined) values.completed_at = patch.completedAt;
      if (patch.startedAt !== undefined) values.started_at = patch.startedAt;
      if (patch.metadata !== undefined) values.metadata = toDbJson(patch.metadata, dialect);
      if (patch.runAttempts !== undefined) values.run_attempts = patch.runAttempts;
      if (patch.leaseOwner !== undefined) values.lease_owner = patch.leaseOwner;
      if (patch.leaseToken !== undefined) values.lease_token = patch.leaseToken;
      if (patch.leaseUntil !== undefined) values.lease_until = patch.leaseUntil;
      await db
        .updateTable(INSTANCES_TABLE)
        .set(values as never)
        .where("id", "=", id)
        .execute();
    },

    async listInstances(filter?: { status?: WorkflowStatus; workflowName?: string; limit?: number }) {
      let q = db.selectFrom(INSTANCES_TABLE).selectAll();
      if (filter?.status) q = q.where("status", "=", filter.status);
      if (filter?.workflowName) q = q.where("workflow_name", "=", filter.workflowName);
      if (filter?.limit) q = q.limit(filter.limit);
      return q.execute().then((rows) => rows.map(rowToInstance));
    },

    async getStep(instanceId: string, stepName: string) {
      const row = await db
        .selectFrom(STEPS_TABLE)
        .selectAll()
        .where("instance_id", "=", instanceId)
        .where("step_name", "=", stepName)
        .executeTakeFirst();
      if (!row) return null;
      return {
        instanceId: row.instance_id,
        stepName: row.step_name,
        status: row.status as StepRecord["status"],
        attempt: row.attempt,
        output: row.output != null ? fromDbJson(row.output) : undefined,
        error: row.error ?? undefined,
        startedAt: row.started_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
        idempotencyKey: row.idempotency_key ?? undefined,
      };
    },

    async saveStep(step: StepRecord) {
      await db
        .insertInto(STEPS_TABLE)
        .values({
          instance_id: step.instanceId,
          step_name: step.stepName,
          status: step.status,
          attempt: step.attempt,
          output: step.output != null ? toDbJson(step.output, dialect) : null,
          error: step.error ?? null,
          started_at: step.startedAt ?? null,
          completed_at: step.completedAt ?? null,
          idempotency_key: step.idempotencyKey ?? null,
        })
        .onConflict((oc) =>
          oc.columns(["instance_id", "step_name"]).doUpdateSet({
            status: step.status,
            attempt: step.attempt,
            output: step.output != null ? toDbJson(step.output, dialect) : null,
            error: step.error ?? null,
            started_at: step.startedAt ?? null,
            completed_at: step.completedAt ?? null,
          }),
        )
        .execute();
    },

    async listSteps(instanceId: string) {
      const rows = await db.selectFrom(STEPS_TABLE).selectAll().where("instance_id", "=", instanceId).execute();
      return rows.map((row) => ({
        instanceId: row.instance_id,
        stepName: row.step_name,
        status: row.status as StepRecord["status"],
        attempt: row.attempt,
        output: row.output != null ? fromDbJson(row.output) : undefined,
        error: row.error ?? undefined,
        startedAt: row.started_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
      }));
    },

    async enqueueDeadLetter(record: WorkflowDeadLetter) {
      await db
        .insertInto(DEAD_LETTER_TABLE)
        .values({
          instance_id: record.instanceId,
          workflow_name: record.workflowName,
          error: record.error,
          failed_at: record.failedAt,
          steps: toDbJson(record.steps, dialect),
        })
        .execute();
    },

    async claimRunnable(limit: number, claimOptions: ClaimRunnableOptions = {}): Promise<ClaimedWorkflowInstance[]> {
      const now = claimOptions.now ?? new Date();
      const workerId = claimOptions.workerId ?? "worker";
      const leaseMs = claimOptions.leaseMs ?? defaultLeaseMs;
      const until = new Date(now.getTime() + leaseMs);

      await releaseExpiredLeases(now);

      const claimed: ClaimedWorkflowInstance[] = [];

      if (dialect === "postgres") {
        for (let i = 0; i < limit; i++) {
          const rowToken = randomUUID();
          const result = await sql<WorkflowsDatabase[typeof INSTANCES_TABLE]>`
            UPDATE ${sql.table(INSTANCES_TABLE)} AS w
            SET
              status = 'running',
              lease_owner = ${workerId},
              lease_token = ${rowToken}::uuid,
              lease_until = ${until},
              updated_at = ${now.toISOString()}
            FROM (
              SELECT id FROM ${sql.table(INSTANCES_TABLE)}
              WHERE
                (
                  status IN ('pending', 'failed')
                  AND (
                    metadata IS NULL
                    OR (metadata->>'availableAt') IS NULL
                    OR (metadata->>'availableAt')::timestamptz <= ${now}
                  )
                )
                OR (
                  status = 'running'
                  AND (
                    lease_token IS NULL
                    OR (lease_until IS NOT NULL AND lease_until < ${now})
                  )
                )
              ORDER BY created_at ASC
              FOR UPDATE SKIP LOCKED
              LIMIT 1
            ) AS picked
            WHERE w.id = picked.id
            RETURNING w.*
          `.execute(db);
          const row = result.rows[0] as WorkflowsDatabase[typeof INSTANCES_TABLE] | undefined;
          if (!row) break;
          claimed.push({ ...rowToInstance(row), leaseToken: rowToken });
        }
        return claimed;
      }

      const candidates = await db
        .selectFrom(INSTANCES_TABLE)
        .selectAll()
        .where("status", "in", ["pending", "failed", "running"])
        .orderBy("created_at asc")
        .limit(limit * 4)
        .execute();

      for (const row of candidates) {
        if (claimed.length >= limit) break;
        const instance = rowToInstance(row);
        if (!isRunnableInstance(instance, now)) continue;
        if (instance.status === "running" && instance.leaseUntil && new Date(instance.leaseUntil) > now) continue;

        const rowToken = randomUUID();
        const updated = await db
          .updateTable(INSTANCES_TABLE)
          .set({
            status: "running",
            lease_owner: workerId,
            lease_token: rowToken,
            lease_until: until.toISOString(),
            updated_at: now.toISOString(),
          })
          .where("id", "=", row.id)
          .where("status", "=", row.status)
          .executeTakeFirst();
        if (!updated.numUpdatedRows || updated.numUpdatedRows === 0n) continue;
        claimed.push({
          ...instance,
          status: "running",
          leaseOwner: workerId,
          leaseToken: rowToken,
          leaseUntil: until.toISOString(),
        });
      }
      return claimed;
    },

    async releaseClaim(instanceId: string, leaseToken: string) {
      const updated = await db
        .updateTable(INSTANCES_TABLE)
        .set({ lease_owner: null, lease_token: null, lease_until: null })
        .where("id", "=", instanceId)
        .where("lease_token", "=", leaseToken)
        .executeTakeFirst();
      return updated.numUpdatedRows > 0n;
    },

    async claimCronFire(scheduleName: string, fireAtUtc: Date) {
      const fireAt = fireAtUtc.toISOString();
      const inserted = await db
        .insertInto(CRON_DEDUPE_TABLE)
        .values({
          schedule_name: scheduleName,
          fire_at_utc: fireAt,
          created_at: new Date().toISOString(),
        })
        .onConflict((oc) => oc.columns(["schedule_name", "fire_at_utc"]).doNothing())
        .returning("schedule_name")
        .executeTakeFirst();
      return Boolean(inserted);
    },
  };
}

function isRunnableInstance(instance: WorkflowInstance, now: Date): boolean {
  if (instance.status === "pending" || instance.status === "failed") {
    const availableAt = instance.metadata?.availableAt as string | undefined;
    return !availableAt || new Date(availableAt).getTime() <= now.getTime();
  }
  if (instance.status === "running") {
    if (!instance.leaseToken) return true;
    return Boolean(instance.leaseUntil && new Date(instance.leaseUntil).getTime() <= now.getTime());
  }
  return false;
}

export async function migrateWorkflowsSchema(db: Kysely<WorkflowsDatabase>, dialect: WorkflowsDialect): Promise<void> {
  const migration = dialect === "postgres" ? POSTGRES_MIGRATION : SQLITE_MIGRATION;
  for (const statement of migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
}
