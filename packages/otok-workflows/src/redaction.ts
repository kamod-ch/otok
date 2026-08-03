export function redactValue(value: unknown, fields: readonly string[]): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, fields));

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(record)) {
    output[key] = fields.includes(key) ? "[REDACTED]" : redactValue(val, fields);
  }
  return output;
}

export function redactForLog<T>(value: T, fields?: readonly string[]): T {
  if (!fields?.length) return value;
  return redactValue(value, fields) as T;
}
