export class OtokAiError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "OtokAiError";
    this.code = code;
  }
}

export class OtokAiConfigError extends OtokAiError {
  constructor(message: string) {
    super("CONFIG_ERROR", message);
    this.name = "OtokAiConfigError";
  }
}

export class OtokAiBudgetExceededError extends OtokAiError {
  constructor(message: string) {
    super("BUDGET_EXCEEDED", message);
    this.name = "OtokAiBudgetExceededError";
  }
}

export class OtokAiRateLimitError extends OtokAiError {
  readonly retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super("RATE_LIMIT", message);
    this.name = "OtokAiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class OtokAiProviderError extends OtokAiError {
  readonly provider: string;
  readonly statusCode?: number;
  constructor(provider: string, message: string, statusCode?: number) {
    super("PROVIDER_ERROR", message);
    this.name = "OtokAiProviderError";
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export class OtokAiAbortedError extends OtokAiError {
  constructor(message = "Generation aborted") {
    super("ABORTED", message);
    this.name = "OtokAiAbortedError";
  }
}

export class OtokAiTimeoutError extends OtokAiError {
  constructor(message = "Generation timed out") {
    super("TIMEOUT", message);
    this.name = "OtokAiTimeoutError";
  }
}

export class OtokAiValidationError extends OtokAiError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "OtokAiValidationError";
  }
}

export class OtokAiMcpPermissionError extends OtokAiError {
  constructor(message: string) {
    super("MCP_PERMISSION_DENIED", message);
    this.name = "OtokAiMcpPermissionError";
  }
}
