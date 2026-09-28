export type DiscussionErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CAPABILITY_MISSING"
  | "TRANSACTION_UNSUPPORTED"
  | "INVALID_TRANSITION"
  | "INVALID_CURSOR"
  | "ACTOR_REQUIRED"
  | "SUBJECT_DENIED"
  | "PROVIDER_UNAVAILABLE";

export class DiscussionError extends Error {
  readonly code: DiscussionErrorCode;

  constructor(code: DiscussionErrorCode, message: string) {
    super(message);
    this.name = "DiscussionError";
    this.code = code;
  }
}
