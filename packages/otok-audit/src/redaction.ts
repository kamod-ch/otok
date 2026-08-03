function redactValue(value: unknown, fields: readonly string[], path = ""): unknown {
  if (value == null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, fields, `${path}[${index}]`));
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(record)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (fields.includes(fullPath) || fields.includes(key)) {
      output[key] = "[REDACTED]";
    } else {
      output[key] = redactValue(val, fields, fullPath);
    }
  }

  return output;
}

export function redactAuditValue<T>(value: T, fields?: readonly string[]): T {
  if (!fields?.length) return value;
  return redactValue(value, fields) as T;
}

export function redactAuditEntry<T extends { actor?: unknown; changes?: unknown; metadata?: unknown }>(
  entry: T,
  fields?: readonly string[],
): T {
  if (!fields?.length) return entry;
  return {
    ...entry,
    actor: redactAuditValue(entry.actor, fields),
    changes: redactAuditValue(entry.changes, fields),
    metadata: redactAuditValue(entry.metadata, fields),
  };
}
