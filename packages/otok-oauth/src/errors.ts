export type OAuthErrorCode =
  | "invalid_state"
  | "missing_code"
  | "provider_error"
  | "profile_error"
  | "adapter_error"
  | "provider_unavailable";

export class OAuthFlowError extends Error {
  readonly code: OAuthErrorCode;

  constructor(code: OAuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "OAuthFlowError";
    this.code = code;
  }
}
