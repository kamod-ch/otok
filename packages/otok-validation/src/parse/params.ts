import { validationError } from "otok/shared";
import type { ParseOptions, ValidationSchema } from "../types.js";
import { validateSchema } from "../standard.js";
import type { RouteParams } from "otok/server";

export type ParseParamsOptions = ParseOptions;

export async function parseParams<TOutput>(
  params: RouteParams,
  schema: ValidationSchema<TOutput>,
  options: ParseParamsOptions = {},
): Promise<TOutput> {
  const result = await validateSchema(schema, params);
  if (!result.success) {
    validationError(
      {
        message: options.message ?? "Invalid route parameters",
        ...result.error,
      },
      options.status ?? 400,
    );
  }

  return result.data;
}
