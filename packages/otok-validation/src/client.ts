import type { ValidationSchema } from "./types.js";
import { validateSchema } from "./standard.js";

/** Client-side validation — same contract as server, throws nothing. */
export async function safeValidate<TOutput>(
  schema: ValidationSchema<TOutput>,
  input: unknown,
): Promise<
  | { success: true; data: TOutput }
  | { success: false; fieldErrors?: Record<string, string[]>; formErrors?: string[] }
> {
  const result = await validateSchema(schema, input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    fieldErrors: result.error.fieldErrors as Record<string, string[]> | undefined,
    formErrors: result.error.formErrors,
  };
}

export { validateSchema, issuesToValidationInput } from "./standard.js";
