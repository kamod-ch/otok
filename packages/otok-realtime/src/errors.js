export class RealtimeException extends Error {
  code;
  retryAfterMs;
  constructor(code, message, retryAfterMs) {
    super(message);
    this.name = "RealtimeException";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryAfterMs: this.retryAfterMs,
    };
  }
}
export function isRealtimeError(value) {
  return Boolean(value && typeof value === "object" && typeof value.code === "string");
}
export function formatRealtimeError(code, message) {
  return { code, message };
}
