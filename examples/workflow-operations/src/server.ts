import { serve } from "@hono/node-server";
import { createMemoryWorkflowStore, WorkflowEngine } from "@kamod-ch/otok-workflows";
import { defineWorkflow, z } from "@kamod-ch/otok-workflows";
import { createWorkflowOpsApp } from "./app.js";

const secret = process.env.WORKFLOW_OPS_SESSION_SECRET;
const password = process.env.WORKFLOW_OPS_OPERATOR_PASSWORD;

if (!secret || secret.length < 16) {
  console.error("WORKFLOW_OPS_SESSION_SECRET must be set (min 16 chars). No insecure default.");
  process.exit(1);
}
if (!password) {
  console.error("WORKFLOW_OPS_OPERATOR_PASSWORD must be set. No default operator account.");
  process.exit(1);
}

const store = createMemoryWorkflowStore();
const engine = new WorkflowEngine({ store });

const noop = defineWorkflow({
  name: "ops.noop",
  input: z.object({}),
  run: async () => ({ ok: true }),
});
engine.register(noop);

const app = createWorkflowOpsApp({
  store,
  engine,
  sessionSecret: secret,
  operatorPassword: password,
  allowTestSessionHeader: process.env.NODE_ENV === "test",
});

const port = Number.parseInt(process.env.WORKFLOW_OPS_PORT ?? "5190", 10);
serve({ fetch: app.fetch, port }, () => {
  console.info(`workflow-operations listening on http://127.0.0.1:${port}`);
});
