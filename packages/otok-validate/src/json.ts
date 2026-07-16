import { validationError } from "otok/shared";
import type { BaseParseOptions, ParseableSchema } from "./types.js";
import { zodErrorToValidationInput } from "./zod-errors.js";

export type ParseJsonOptions = BaseParseOptions;

export async function parseJson<TOutput>(
  request: Request,
  schema: ParseableSchema<TOutput>,
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

  const result = schema.safeParse(body);
  if (!result.success) {
    validationError(
      {
        message: options.message ?? "Validation failed",
        ...zodErrorToValidationInput(result.error),
      },
      options.status,
    );
  }

  return result.data;
}

export function parseJsonValue<TOutput>(
  value: unknown,
  schema: ParseableSchema<TOutput>,
  options: ParseJsonOptions = {},
): TOutput {
  const result = schema.safeParse(value);
  if (!result.success) {
    validationError(
      {
        message: options.message ?? "Validation failed",
        ...zodErrorToValidationInput(result.error),
      },
      options.status,
    );
  }

  return result.data;
}
