import type { AiToolDefinition } from "../types.js";
import type { AiSchema } from "../types.js";

/** Create a typed tool definition for AI agent actions. */
export function defineAiTool<TInput, TOutput>(definition: {
  name: string;
  description: string;
  parameters: AiSchema<TInput>;
  execute: AiToolDefinition<TInput, TOutput>["execute"];
}): AiToolDefinition<TInput, TOutput> {
  return definition;
}

/** Wrap a Standard Schema validator for tool/structured output definitions. */
export function aiSchema<T>(schema: AiSchema<T>): AiSchema<T> {
  return schema;
}

export type InferToolInput<T extends AiToolDefinition<any, any>> =
  T extends AiToolDefinition<infer I, any> ? I : never;

export type InferToolOutput<T extends AiToolDefinition<any, any>> =
  T extends AiToolDefinition<any, infer O> ? O : never;
