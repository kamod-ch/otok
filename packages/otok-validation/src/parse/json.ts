import { validationError } from "@kamod-ch/otok/shared";
import type { ParseOptions, ValidationSchema } from "../types.js";
import { validateSchema } from "../standard.js";

export type ParseJsonOptions = ParseOptions;

export async function parseJson<TOutput>(
  request: Request,
  schema: ValidationSchema<TOutput>,
  options: ParseJsonOptions = {},
): Promise<TOutput> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    validationError(
      {
        message: options.message ?? "Invalid JSON body",
        formErrors: ["Request body must be valid JSON."],
      },
      options.status ?? 400,
    );
  }

  const result = await validateSchema(schema, body);
  if (!result.success) {
    validationError(
      {
        message: options.message ?? "Validation failed",
        ...result.error,
      },
      options.status,
    );
  }

  return result.data;
}

export async function parseJsonValue<TOutput>(
  value: unknown,
  schema: ValidationSchema<TOutput>,
  options: ParseJsonOptions = {},
): Promise<TOutput> {
  const result = await validateSchema(schema, value);
  if (!result.success) {
    validationError(
      {
        message: options.message ?? "Validation failed",
        ...result.error,
      },
      options.status,
    );
  }

  return result.data;
}
