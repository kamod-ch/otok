export class OtokMailError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[otok-mail:${code}] ${message}`);
    this.name = "OtokMailError";
    this.code = code;
  }
}

export class OtokMailConfigError extends OtokMailError {
  constructor(message: string) {
    super("config", message);
    this.name = "OtokMailConfigError";
  }
}

export class OtokMailRuntimeError extends OtokMailError {
  constructor(message: string) {
    super("runtime", message);
    this.name = "OtokMailRuntimeError";
  }
}

export class OtokMailSendError extends OtokMailError {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super("send", message);
    this.name = "OtokMailSendError";
    this.retryable = retryable;
  }
}

export function isRetryableMailError(error: unknown): boolean {
  return error instanceof OtokMailSendError && error.retryable;
}
