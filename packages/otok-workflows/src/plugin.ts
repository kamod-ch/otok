import { definePlugin } from "otok";
import type { Hono } from "hono";
import { WorkflowEngine } from "./engine.js";
import { registerWorkflowRuntime } from "./registry.js";
import { createMemoryWorkflowStore } from "./providers/memory.js";
import type { CronTrigger, EventTrigger, WorkflowDefinition, WorkflowEngineOptions } from "./types.js";

export type WorkflowProviderConfig =
  | { type: "memory" }
  | { type: "custom"; store: WorkflowEngineOptions["store"] };

export interface WorkflowsPluginOptions {
  provider?: WorkflowProviderConfig;
  workflows: Record<string, WorkflowDefinition>;
  cron?: CronTrigger[];
  events?: EventTrigger[];
  retry?: WorkflowEngineOptions["retry"];
  webhookPath?: string;
  processIntervalMs?: number;
}

const workflowsPluginFactory = definePlugin<WorkflowsPluginOptions>({
  name: "@kamod-ch/otok-workflows",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("workflows() options must be an object");
      }
      const record = input as WorkflowsPluginOptions;
      if (!record.workflows || typeof record.workflows !== "object") {
        throw new Error("workflows() requires workflows map");
      }
      return record;
    },
  },
});

export function createWorkflowStore(config: WorkflowProviderConfig = { type: "memory" }) {
  switch (config.type) {
    case "memory":
      return createMemoryWorkflowStore();
    case "custom":
      return config.store;
    default:
      return createMemoryWorkflowStore();
  }
}

export function configureWorkflowsApp(app: Hono, options: WorkflowsPluginOptions): WorkflowEngine {
  const store = createWorkflowStore(options.provider);
  const engine = new WorkflowEngine({ store, retry: options.retry });

  for (const def of Object.values(options.workflows)) {
    engine.register(def);
  }
  for (const trigger of options.cron ?? []) {
    engine.registerCron(trigger);
  }
  for (const trigger of options.events ?? []) {
    engine.registerEvent(trigger);
  }

  registerWorkflowRuntime(engine);

  const base = options.webhookPath ?? "/workflows/webhook";

  app.post(`${base}/:workflowName`, async (c) => {
    const name = c.req.param("workflowName");
    const def = engine.getDefinition(name);
    if (!def) return c.json({ code: "NOT_FOUND", message: "Unknown workflow" }, 404);
    const body = await c.req.json().catch(() => ({}));
    const instance = await engine.start(def, body);
    return c.json({ id: instance.id, status: instance.status });
  });

  app.get("/workflows/:id/status", async (c) => {
    const status = await engine.getStatus(c.req.param("id"));
    if (!status) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(status);
  });

  app.post("/workflows/:id/resume", async (c) => {
    const result = await engine.resume(c.req.param("id"));
    return c.json(result ?? { code: "NOT_FOUND" });
  });

  app.post("/workflows/:id/cancel", async (c) => {
    await engine.cancel(c.req.param("id"));
    return c.json({ ok: true });
  });

  if (options.processIntervalMs) {
    setInterval(() => void engine.processRunnable(), options.processIntervalMs);
  }

  return engine;
}

export default function workflowsPlugin(options: WorkflowsPluginOptions) {
  const plugin = workflowsPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureWorkflowsApp(app, options);
  };
  return plugin;
}
