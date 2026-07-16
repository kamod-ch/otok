import type { JsonValue } from "otok/shared";

export function toJsonValues(record: Record<string, unknown>): Record<string, JsonValue> {
  const values: Record<string, JsonValue> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value instanceof File) {
      values[key] = value.name;
      continue;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      values[key] = value;
      continue;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      values[key] = value;
    }
  }

  return values;
}

export function resolveSubmittedValues(
  record: Record<string, unknown>,
  valuesOption: boolean | Record<string, JsonValue> | undefined,
  defaultInclude: boolean,
): Record<string, JsonValue> | undefined {
  if (valuesOption === false) return undefined;
  if (valuesOption && typeof valuesOption === "object") return valuesOption;
  if (valuesOption === true || defaultInclude) return toJsonValues(record);
  return undefined;
}
