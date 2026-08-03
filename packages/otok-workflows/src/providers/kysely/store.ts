import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { StepRecord, WorkflowDeadLetter, WorkflowInstance, WorkflowStatus, WorkflowStore } from "../../types.js";
import { parseJson, serializeJson } from "../../types.js";

export const INSTANCES_TABLE = "workflow_instances";
export const STEPS_TABLE = "workflow_steps";
export const DEAD_LETTER_TABLE = "workflow_dead_letter";

export interface WorkflowsDatabase {
  [INSTANCES_TABLE]: {
    id: string;
    workflow_name: string;
    status: string;
    input: string;
    output: string | null;
    progress: number;
    current_step: string | null;
    idempotency_key: string | null;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    completed_at: string | null;
    error: string | null;
    request_id: string | null;
    metadata: string | null;
  };
  [STEPS_TABLE]: {
    instance_id: string;
    step_name: string;
    status: string;
    attempt: number;
    output: string | null;
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
    steps: string;
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error TEXT,
  request_id TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON ${INSTANCES_TABLE}(status, updated_at);

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
`;

export const POSTGRES_MIGRATION = SQLITE_MIGRATION.replace(/TEXT/g, "TEXT").replace(
  "input TEXT NOT NULL",
  "input JSONB NOT NULL",
);

function rowToInstance(row: WorkflowsDatabase[typeof INSTANCES_TABLE]): WorkflowInstance {
  return {
    id: row.id,
    workflowName: row.workflow_name,
    status: row.status as WorkflowStatus,
    input: parseJson(row.input),
    output: row.output ? parseJson(row.output) : undefined,
    progress: row.progress,
    currentStep: row.current_step ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    error: row.error ?? undefined,
    requestId: row.request_id ?? undefined,
    metadata: row.metadata ? parseJson(row.metadata) : undefined,
  };
}

export function createKyselyWorkflowStore(db: Kysely<WorkflowsDatabase>): WorkflowStore {
  return {
    async createInstance(instance: WorkflowInstance) {
      await db.insertInto(INSTANCES_TABLE).values({
        id: instance.id,
        workflow_name: instance.workflowName,
        status: instance.status,
        input: serializeJson(instance.input),
        output: instance.output != null ? serializeJson(instance.output) : null,
        progress: instance.progress,
        current_step: instance.currentStep ?? null,
        idempotency_key: instance.idempotencyKey ?? null,
        created_at: instance.createdAt,
        updated_at: instance.updatedAt,
        started_at: instance.startedAt ?? null,
        completed_at: instance.completedAt ?? null,
        error: instance.error ?? null,
        request_id: instance.requestId ?? null,
        metadata: instance.metadata ? serializeJson(instance.metadata) : null,
      }).execute();
    },

    async getInstance(id: string) {
      const row = await db.selectFrom(INSTANCES_TABLE).selectAll().where("id", "=", id).executeTakeFirst();
      return row ? rowToInstance(row) : null;
    },

    async findByIdempotencyKey(key: string) {
      const row = await db.selectFrom(INSTANCES_TABLE).selectAll().where("idempotency_key", "=", key).executeTakeFirst();
      return row ? rowToInstance(row) : null;
    },

    async updateInstance(id: string, patch: Partial<WorkflowInstance>) {
      const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status) values.status = patch.status;
      if (patch.output !== undefined) values.output = serializeJson(patch.output);
      if (patch.progress !== undefined) values.progress = patch.progress;
      if (patch.currentStep !== undefined) values.current_step = patch.currentStep;
      if (patch.error !== undefined) values.error = patch.error;
      if (patch.completedAt !== undefined) values.completed_at = patch.completedAt;
      if (patch.startedAt !== undefined) values.started_at = patch.startedAt;
      if (patch.metadata !== undefined) values.metadata = serializeJson(patch.metadata);
      await db.updateTable(INSTANCES_TABLE).set(values as never).where("id", "=", id).execute();
    },

    async listInstances(filter?: { status?: WorkflowStatus; workflowName?: string; limit?: number }) {
      let q = db.selectFrom(INSTANCES_TABLE).selectAll();
      if (filter?.status) q = q.where("status", "=", filter.status);
      if (filter?.workflowName) q = q.where("workflow_name", "=", filter.workflowName);
      if (filter?.limit) q = q.limit(filter.limit);
      const rows = await q.execute();
      return rows.map(rowToInstance);
    },

    async getStep(instanceId: string, stepName: string) {
      const row = await db.selectFrom(STEPS_TABLE).selectAll()
        .where("instance_id", "=", instanceId).where("step_name", "=", stepName).executeTakeFirst();
      if (!row) return null;
      return {
        instanceId: row.instance_id,
        stepName: row.step_name,
        status: row.status as StepRecord["status"],
        attempt: row.attempt,
        output: row.output ? parseJson(row.output) : undefined,
        error: row.error ?? undefined,
        startedAt: row.started_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
        idempotencyKey: row.idempotency_key ?? undefined,
      };
    },

    async saveStep(step: StepRecord) {
      await db.insertInto(STEPS_TABLE).values({
        instance_id: step.instanceId,
        step_name: step.stepName,
        status: step.status,
        attempt: step.attempt,
        output: step.output != null ? serializeJson(step.output) : null,
        error: step.error ?? null,
        started_at: step.startedAt ?? null,
        completed_at: step.completedAt ?? null,
        idempotency_key: step.idempotencyKey ?? null,
      }).onConflict((oc) => oc.columns(["instance_id", "step_name"]).doUpdateSet({
        status: step.status,
        attempt: step.attempt,
        output: step.output != null ? serializeJson(step.output) : null,
        error: step.error ?? null,
        started_at: step.startedAt ?? null,
        completed_at: step.completedAt ?? null,
      })).execute();
    },

    async listSteps(instanceId: string) {
      const rows = await db.selectFrom(STEPS_TABLE).selectAll().where("instance_id", "=", instanceId).execute();
      return rows.map((row) => ({
        instanceId: row.instance_id,
        stepName: row.step_name,
        status: row.status as StepRecord["status"],
        attempt: row.attempt,
        output: row.output ? parseJson(row.output) : undefined,
        error: row.error ?? undefined,
        startedAt: row.started_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
      }));
    },

    async enqueueDeadLetter(record: WorkflowDeadLetter) {
      await db.insertInto(DEAD_LETTER_TABLE).values({
        instance_id: record.instanceId,
        workflow_name: record.workflowName,
        error: record.error,
        failed_at: record.failedAt,
        steps: serializeJson(record.steps),
      }).execute();
    },

    async claimRunnable(limit: number, now = new Date()) {
      const rows = await db.selectFrom(INSTANCES_TABLE).selectAll()
        .where("status", "in", ["pending", "failed"])
        .orderBy("created_at asc")
        .limit(limit)
        .execute();
      return rows
        .filter((row) => {
          if (!row.metadata) return true;
          const meta = parseJson<{ availableAt?: string }>(row.metadata);
          return !meta.availableAt || new Date(meta.availableAt).getTime() <= now.getTime();
        })
        .map(rowToInstance);
    },
  };
}

export async function migrateWorkflowsSchema(db: Kysely<WorkflowsDatabase>, dialect: WorkflowsDialect): Promise<void> {
  const migration = dialect === "postgres" ? POSTGRES_MIGRATION : SQLITE_MIGRATION;
  for (const statement of migration.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.raw(statement).execute(db);
  }
}
