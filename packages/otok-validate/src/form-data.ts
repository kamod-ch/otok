import { validationError } from "otok/shared";
import { formDataToRecord, type FormDataToRecordOptions } from "./form-data-to-record.js";
import type { BaseParseOptions, ParseableSchema } from "./types.js";
import { resolveSubmittedValues } from "./values.js";
import { zodErrorToValidationInput } from "./zod-errors.js";

export type ParseFormDataOptions = FormDataToRecordOptions &
  BaseParseOptions & {
    /** When set, parse this record instead of converting `formData`. */
    input?: Record<string, unknown>;
  };

export function parseFormData<TOutput>(
  formData: FormData | undefined,
  schema: ParseableSchema<TOutput>,
  options: ParseFormDataOptions = {},
): TOutput {
  const record = options.input ?? formDataToRecord(formData, options);
  const result = schema.safeParse(record);

  if (!result.success) {
    const values = resolveSubmittedValues(record, options.values, true);
    validationError(
      {
        message: options.message ?? "Validation failed",
        ...zodErrorToValidationInput(result.error, values),
      },
      options.status,
    );
  }

  return result.data;
}

export { formDataToRecord, type FormDataToRecordOptions };
