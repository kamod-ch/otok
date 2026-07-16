export type FormDataToRecordOptions = {
  /** Field names that collect repeated values into a string array. */
  arrays?: string[];
  /** Checkbox fields: missing => false, "on"/"true"/"1" => true. */
  checkboxes?: string[];
};

export function formDataToRecord(
  formData: FormData | undefined,
  options: FormDataToRecordOptions = {},
): Record<string, unknown> {
  if (!formData) return {};

  const arrays = new Set(options.arrays ?? []);
  const checkboxes = new Set(options.checkboxes ?? []);
  const record: Record<string, unknown> = {};

  for (const key of checkboxes) {
    record[key] = false;
  }

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      record[key] = value.size > 0 ? value : "";
      continue;
    }

    if (arrays.has(key)) {
      const existing = record[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        record[key] = [value];
      }
      continue;
    }

    if (checkboxes.has(key)) {
      record[key] = value === "on" || value === "true" || value === "1";
      continue;
    }

    record[key] = value;
  }

  return record;
}
