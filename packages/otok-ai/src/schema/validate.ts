import type { AiSchema, StandardSchemaResult } from "../types.js";
import { OtokAiValidationError } from "../errors.js";

export async function validateSchema<T>(schema: AiSchema<T>, value: unknown): Promise<T> {
  const result = schema["~standard"].validate(value);
  const resolved = (result instanceof Promise ? await result : result) as StandardSchemaResult<T>;
  if ("issues" in resolved && resolved.issues?.length) {
    const msg = resolved.issues.map((issue) => issue.message).join("; ");
    throw new OtokAiValidationError(msg);
  }
  return resolved.value as T;
}

export function schemaToJsonSchema(schema: AiSchema): Record<string, unknown> {
  // Minimal JSON Schema hint for providers — Zod 4 Standard Schema exposes vendor metadata
  const vendor = schema["~standard"].vendor;
  if (vendor === "zod") {
    return { type: "object", additionalProperties: true, $schema: "https://json-schema.org/draft/2020-12/schema" };
  }
  return { type: "object", additionalProperties: true };
}

export function parseStructuredOutput<T>(raw: string, schema: AiSchema<T>): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new OtokAiValidationError("Structured output is not valid JSON");
    parsed = JSON.parse(match[0]);
  }
  const result = schema["~standard"].validate(parsed);
  if (result instanceof Promise) {
    throw new OtokAiValidationError("Async schema validation not supported in sync parse");
  }
  const resolved = result as StandardSchemaResult<T>;
  if ("issues" in resolved && resolved.issues?.length) {
    throw new OtokAiValidationError(resolved.issues.map((issue) => issue.message).join("; "));
  }
  return resolved.value as T;
}

export async function parseStructuredOutputAsync<T>(raw: string, schema: AiSchema<T>): Promise<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new OtokAiValidationError("Structured output is not valid JSON");
    parsed = JSON.parse(match[0]);
  }
  return validateSchema(schema, parsed);
}
