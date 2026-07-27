export class OtokQueueError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[otok-queue:${code}] ${message}`);
    this.name = "OtokQueueError";
    this.code = code;
  }
}

export class OtokQueueConfigError extends OtokQueueError {
  constructor(message: string) {
    super("config", message);
    this.name = "OtokQueueConfigError";
  }
}

export class OtokQueueJobError extends OtokQueueError {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super("job", message);
    this.name = "OtokQueueJobError";
    this.retryable = retryable;
  }
}

export function isRetryableQueueError(error: unknown): boolean {
  return error instanceof OtokQueueJobError && error.retryable;
}
