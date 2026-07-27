const DEFAULT_REDACT = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "token",
  "secret",
  "api_key",
  "api-key",
  "_csrf",
  "session",
  "credit_card",
  "creditcard",
];

const REDACTED = "[REDACTED]";

export function createRedactor(extraKeys: string[] = []) {
  const keys = new Set([...DEFAULT_REDACT, ...extraKeys].map((k) => k.toLowerCase()));

  const redactValue = (key: string, value: unknown): unknown => {
    if (keys.has(key.toLowerCase())) return REDACTED;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return redactObject(value as Record<string, unknown>);
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => redactValue(String(index), item));
    }
    return value;
  };

  const redactObject = (input: Record<string, unknown>): Record<string, unknown> => {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (keys.has(key.toLowerCase())) {
        output[key] = REDACTED;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        output[key] = redactObject(value as Record<string, unknown>);
      } else {
        output[key] = value;
      }
    }
    return output;
  };

  return {
    redactObject,
    redactHeaders(headers: Headers): Record<string, string> {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = keys.has(key.toLowerCase()) ? REDACTED : value;
      });
      return result;
    },
    redactFormData(formData: FormData): Record<string, string> {
      const result: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        result[key] = keys.has(key.toLowerCase()) ? REDACTED : String(value);
      }
      return result;
    },
    redactValue,
  };
}

export type Redactor = ReturnType<typeof createRedactor>;
