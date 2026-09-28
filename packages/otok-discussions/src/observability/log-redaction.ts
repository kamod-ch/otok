const SENSITIVE_KEYS = new Set([
  "bodymarkdown",
  "body_html",
  "bodyhtml",
  "body",
  "details",
  "reasontext",
  "reason_text",
  "session",
  "cookie",
  "authorization",
  "token",
  "ip",
  "x-forwarded-for",
  "x-real-ip",
]);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) return true;
  return lower.includes("password") || lower.includes("secret");
}

export function redactDiscussionLogRecord<T extends Record<string, unknown>>(record: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (isSensitiveKey(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactDiscussionLogRecord(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}
