export type WorkflowErrorCode =
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CANCELLED"
  | "PAUSED"
  | "WAITING_APPROVAL"
  | "TIMEOUT"
  | "DEAD"
  | "DUPLICATE";

export class WorkflowException extends Error {
  readonly code: WorkflowErrorCode;

  constructor(code: WorkflowErrorCode, message: string) {
    super(message);
    this.name = "WorkflowException";
    this.code = code;
  }
}

export function isWaitingApproval(error: unknown): boolean {
  return error instanceof WorkflowException && error.code === "WAITING_APPROVAL";
}
