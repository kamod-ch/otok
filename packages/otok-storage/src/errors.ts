export class OtokStorageError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[otok-storage:${code}] ${message}`);
    this.name = "OtokStorageError";
    this.code = code;
  }
}

export class OtokStorageConfigError extends OtokStorageError {
  constructor(message: string) {
    super("config", message);
    this.name = "OtokStorageConfigError";
  }
}

export class OtokStorageValidationError extends OtokStorageError {
  constructor(message: string) {
    super("validation", message);
    this.name = "OtokStorageValidationError";
  }
}
