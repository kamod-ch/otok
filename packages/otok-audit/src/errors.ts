export class AuditException extends Error {
  constructor(
    readonly code: "NOT_REGISTERED" | "INVALID_INPUT" | "NOT_FOUND" | "IMMUTABLE",
    message: string,
  ) {
    super(message);
    this.name = "AuditException";
  }
}
