import type { WorkflowEngine } from "./engine.js";
import type { StartWorkflowOptions, WorkflowDefinition } from "./types.js";

let runtimeEngine: WorkflowEngine | null = null;

export function registerWorkflowRuntime(engine: WorkflowEngine): void {
  runtimeEngine = engine;
}

export function getWorkflowRuntime(): WorkflowEngine {
  if (!runtimeEngine) {
    throw new Error("otok-workflows: not registered. Add workflows() to otok.config.ts.");
  }
  return runtimeEngine;
}

export function resetWorkflowRuntimeForTests(): void {
  runtimeEngine = null;
}

export const workflows = {
  start<TInput, TOutput>(
    definition: WorkflowDefinition<TInput, TOutput>,
    input: TInput,
    options?: StartWorkflowOptions,
  ) {
    return getWorkflowRuntime().start(definition, input, options);
  },
  execute(instanceId: string) {
    return getWorkflowRuntime().execute(instanceId);
  },
  pause(instanceId: string) {
    return getWorkflowRuntime().pause(instanceId);
  },
  resume(instanceId: string) {
    return getWorkflowRuntime().resume(instanceId);
  },
  cancel(instanceId: string) {
    return getWorkflowRuntime().cancel(instanceId);
  },
  status(instanceId: string) {
    return getWorkflowRuntime().getStatus(instanceId);
  },
  processRunnable(limit?: number) {
    return getWorkflowRuntime().processRunnable(limit);
  },
};
