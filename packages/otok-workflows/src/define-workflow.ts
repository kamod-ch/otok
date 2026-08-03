import type { ZodType } from "zod";
import type { WorkflowDefinition, WorkflowStepContext } from "./types.js";

export interface DefineWorkflowOptions<TInput, TOutput> {
  name: string;
  input: ZodType<TInput>;
  output?: ZodType<TOutput>;
  retry?: WorkflowDefinition<TInput, TOutput>["retry"];
  timeoutMs?: number;
  redactFields?: readonly string[];
  compensate?: WorkflowDefinition<TInput, TOutput>["compensate"];
  run: (ctx: WorkflowStepContext<TInput>) => TOutput | Promise<TOutput>;
}

/** Declare a durable, typed workflow with individually replayable steps. */
export function defineWorkflow<TInput, TOutput = unknown>(
  options: DefineWorkflowOptions<TInput, TOutput>,
): WorkflowDefinition<TInput, TOutput> {
  if (!options.name.trim()) {
    throw new Error("otok-workflows: defineWorkflow requires a non-empty name");
  }

  return {
    __kind: "otok-workflow",
    name: options.name,
    inputSchema: options.input,
    outputSchema: options.output,
    retry: options.retry,
    timeoutMs: options.timeoutMs,
    redactFields: options.redactFields,
    compensate: options.compensate,
    run: options.run,
  };
}

export function isWorkflowDefinition(value: unknown): value is WorkflowDefinition {
  return Boolean(
    value && typeof value === "object" && (value as WorkflowDefinition).__kind === "otok-workflow",
  );
}

export { z } from "zod";
