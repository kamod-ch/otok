import type { ValidationSchema } from "../types.js";

/** Zod 4 implements Standard Schema — pass schemas directly. Re-export for explicit imports. */
export type { ValidationSchema };

/** Wrap a Zod schema for explicit adapter usage (identity for Zod 4+). */
export function fromZod<T>(schema: ValidationSchema<T>): ValidationSchema<T> {
  return schema;
}
