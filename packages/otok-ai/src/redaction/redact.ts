const SECRET_PATTERNS: RegExp[] = [
  /\b(sk-[a-zA-Z0-9]{20,})\b/g,
  /\b(ghp_[a-zA-Z0-9]{20,})\b/g,
  /\b(xox[baprs]-[a-zA-Z0-9-]{20,})\b/g,
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b(eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/g,
  /\b(api[_-]?key\s*[:=]\s*["']?[\w-]{16,}["']?)/gi,
  /\b(password\s*[:=]\s*["']?[^\s"']{8,}["']?)/gi,
  /\b(secret\s*[:=]\s*["']?[^\s"']{8,}["']?)/gi,
  /\b(Bearer\s+[a-zA-Z0-9._-]{20,})\b/gi,
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

export interface RedactionOptions {
  /** Also redact email addresses */
  emails?: boolean;
  /** Custom patterns */
  patterns?: RegExp[];
  replacement?: string;
}

export function redactText(text: string, options: RedactionOptions = {}): string {
  const replacement = options.replacement ?? "[REDACTED]";
  let result = text;
  for (const pattern of [...SECRET_PATTERNS, ...(options.patterns ?? [])]) {
    result = result.replace(pattern, replacement);
  }
  if (options.emails) {
    result = result.replace(EMAIL_PATTERN, replacement);
  }
  return result;
}

export function redactMessages<T extends { content?: string; role?: string }>(
  messages: T[],
  options?: RedactionOptions,
): T[] {
  return messages.map((m) => {
    if (typeof m.content === "string") {
      return { ...m, content: redactText(m.content, options) };
    }
    return m;
  });
}

export function containsSecrets(text: string): boolean {
  const probe = redactText(text);
  return probe.includes("[REDACTED]");
}

export function stripEnvValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (/secret|password|token|key|auth|credential/i.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      result[key] = redactText(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = stripEnvValues(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
