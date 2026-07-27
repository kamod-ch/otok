import type { StandardSchemaV1, ValidationSchema } from "../types.js";

/** Wrap a Valibot schema as Standard Schema compatible ValidationSchema. */
export function fromValibot<T>(schema: {
  readonly "~standard": StandardSchemaV1<unknown, T>["~standard"];
}): ValidationSchema<T> {
  return schema as ValidationSchema<T>;
}

/** Valibot v1+ implements Standard Schema natively. */
export type { ValidationSchema };
