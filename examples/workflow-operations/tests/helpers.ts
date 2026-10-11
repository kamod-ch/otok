import { createMemoryWorkflowStore, defineWorkflow, WorkflowEngine, z } from "@kamod-ch/otok-workflows";
import type { WorkflowInstance } from "@kamod-ch/otok-workflows";
import { createWorkflowOpsApp } from "../src/app.js";
import { AuditLog } from "../src/audit.js";
import { IdempotencyStore } from "../src/idempotency.js";

const SECRET = "test-secret-32-characters-min!!";
const PASSWORD = "test-password";

export function createTestHarness() {
  const store = createMemoryWorkflowStore();
  const engine = new WorkflowEngine({ store });
  const wf = defineWorkflow({
    name: "demo.wf",
    input: z.object({}),
    run: async ({ step }) => {
      await step.run("a", () => "ok");
      return { done: true };
    },
  });
  engine.register(wf);
  const audit = new AuditLog();
  const idempotency = new IdempotencyStore();
  const app = createWorkflowOpsApp({
    store,
    engine,
    sessionSecret: SECRET,
    operatorPassword: PASSWORD,
    audit,
    idempotency,
    allowTestSessionHeader: true,
  });
  return { app, store, engine, audit, idempotency };
}

export function operatorHeader(
  permissions: ("workflow:read" | "workflow:operate" | "workflow:audit")[] = ["workflow:read", "workflow:operate"],
) {
  return { "x-ops-test-session": JSON.stringify({ operatorId: "test-op", permissions }) };
}

export async function seedInstance(
  store: ReturnType<typeof createMemoryWorkflowStore>,
  partial: Partial<WorkflowInstance> & Pick<WorkflowInstance, "id" | "status" | "workflowName">,
): Promise<void> {
  const now = new Date().toISOString();
  await store.createInstance({
    id: partial.id,
    workflowName: partial.workflowName,
    status: partial.status,
    input: partial.input ?? {},
    progress: partial.progress ?? 0,
    workflowVersion: 1,
    runAttempts: 0,
    maxRunAttempts: 3,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    currentStep: partial.currentStep,
    leaseOwner: partial.leaseOwner,
    leaseToken: partial.leaseToken,
    leaseUntil: partial.leaseUntil,
    error: partial.error,
  });
}

export async function fetchCsrf(
  app: ReturnType<typeof createWorkflowOpsApp>,
  path: string,
  headers: Record<string, string>,
) {
  const res = await app.request(path, { headers });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const csrfMatch = setCookie.match(/workflow_ops_csrf=([^;]+)/);
  const cookie = setCookie.split(";")[0];
  return { res, csrf: csrfMatch?.[1] ?? "", cookie };
}

export { SECRET, PASSWORD };
