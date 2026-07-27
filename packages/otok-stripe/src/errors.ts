export class OtokStripeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[otok-stripe:${code}] ${message}`);
    this.name = "OtokStripeError";
    this.code = code;
  }
}

export class OtokStripeConfigError extends OtokStripeError {
  constructor(message: string) {
    super("config", message);
    this.name = "OtokStripeConfigError";
  }
}

export class OtokStripeRuntimeError extends OtokStripeError {
  constructor(message: string) {
    super("runtime", message);
    this.name = "OtokStripeRuntimeError";
  }
}
