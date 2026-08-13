import type { ValidationErrorInput } from "@kamod-ch/otok/shared";
import type {
  LegacyParseableError,
  StandardSchemaIssue,
  StandardSchemaResult,
  StandardSchemaV1,
  ValidationSchema,
} from "./types.js";

export function isStandardSchema<T>(schema: ValidationSchema<T>): schema is StandardSchemaV1<unknown, T> {
  const candidate = schema as StandardSchemaV1;
  return (
    typeof schema === "object" &&
    schema !== null &&
    "~standard" in schema &&
    typeof candidate["~standard"]?.validate === "function"
  );
}

export function isLegacySchema<T>(schema: ValidationSchema<T>): schema is import("./types.js").LegacyParseableSchema<T> {
  return typeof (schema as import("./types.js").LegacyParseableSchema<T>).safeParse === "function";
}

export async function validateSchema<TOutput>(
  schema: ValidationSchema<TOutput>,
  input: unknown,
): Promise<{ success: true; data: TOutput } | { success: false; error: ValidationErrorInput }> {
  if (isStandardSchema(schema)) {
    const result = await schema["~standard"].validate(input);
    if (!isFailure(result)) {
      return { success: true, data: result.value };
    }
    return { success: false, error: issuesToValidationInput(result.issues) };
  }

  if (isLegacySchema(schema)) {
    const result = schema.safeParse(input);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: legacyErrorToValidationInput(result.error) };
  }

  throw new Error("otok-validation: schema must implement Standard Schema or safeParse().");
}

function isFailure(result: StandardSchemaResult<unknown>): result is { issues: ReadonlyArray<StandardSchemaIssue> } {
  return "issues" in result && Array.isArray(result.issues);
}

export function issuesToValidationInput(
  issues: ReadonlyArray<StandardSchemaIssue>,
  values?: Record<string, import("@kamod-ch/otok/shared").JsonValue>,
): ValidationErrorInput {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    const path = issue.path?.filter((segment) => typeof segment === "string" || typeof segment === "number") ?? [];
    if (path.length === 0) {
      formErrors.push(issue.message);
      continue;
    }
    const key = path.map(String).join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    formErrors: formErrors.length > 0 ? formErrors : undefined,
    values,
  };
}

export function legacyErrorToValidationInput(
  error: LegacyParseableError,
  values?: Record<string, import("@kamod-ch/otok/shared").JsonValue>,
): ValidationErrorInput {
  if (typeof error.flatten === "function") {
    const flattened = error.flatten();
    const fieldErrors: Record<string, string[]> = {};

    for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
      if (!messages) continue;
      fieldErrors[field] = Array.isArray(messages) ? [...messages] : [messages];
    }

    return {
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formErrors: flattened.formErrors.length > 0 ? [...flattened.formErrors] : undefined,
      values,
    };
  }

  return issuesToValidationInput(
    error.issues.map((issue) => ({ message: issue.message, path: issue.path })),
    values,
  );
}

export function stripUnknownFields(
  input: Record<string, unknown>,
  knownKeys: string[],
): Record<string, unknown> {
  const allowed = new Set(knownKeys);
  return Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key)));
}
