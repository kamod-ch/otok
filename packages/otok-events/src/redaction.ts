import type { DomainEvent, EventDefinition } from "./types.js";

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

export function redactPayload<T>(payload: T, fields?: readonly string[]): T {
  if (!fields?.length) return payload;
  return redactValue(payload, fields) as T;
}

export function redactEvent<T>(event: DomainEvent<T>, definition?: EventDefinition<T>): DomainEvent<T> {
  const fields = definition?.redactFields;
  if (!fields?.length) return event;
  return {
    ...event,
    payload: redactPayload(event.payload, fields),
  };
}

export function safeEventForLog<T>(event: DomainEvent<T>, definition?: EventDefinition<T>): DomainEvent<T> {
  return redactEvent(event, definition);
}
