import type { RealtimeError, RealtimeErrorCode } from "./types.js";

export class RealtimeException extends Error {
  readonly code: RealtimeErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: RealtimeErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "RealtimeException";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }

  toJSON(): RealtimeError {
    return {
      code: this.code,
      message: this.message,
      retryAfterMs: this.retryAfterMs,
    };
  }
}

export function isRealtimeError(value: unknown): value is RealtimeError {
  return Boolean(
    value && typeof value === "object" && typeof (value as RealtimeError).code === "string",
  );
}

export function formatRealtimeError(code: RealtimeErrorCode, message: string): RealtimeError {
  return { code, message };
}
