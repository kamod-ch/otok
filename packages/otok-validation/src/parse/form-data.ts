import { validationError } from "otok/shared";
import type { FormParseOptions, ValidationSchema } from "../types.js";
import { validateSchema } from "../standard.js";
import { resolveSubmittedValues } from "../values.js";
import { formDataToRecord } from "./form-data-to-record.js";

export async function parseFormData<TOutput>(
  formData: FormData | undefined,
  schema: ValidationSchema<TOutput>,
  options: FormParseOptions = {},
): Promise<TOutput> {
  const record = options.input ?? formDataToRecord(formData, options);
  const result = await validateSchema(schema, record);

  if (!result.success) {
    const values = resolveSubmittedValues(record, options.values, true);
    validationError(
      {
        message: options.message ?? "Validation failed",
        ...result.error,
        values,
      },
      options.status,
    );
  }

  return result.data;
}

export { formDataToRecord, type FormParseOptions as FormDataToRecordOptions };
