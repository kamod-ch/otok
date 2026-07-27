export type AuthErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "invalid_session"
  | "csrf_invalid"
  | "unsafe_redirect";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message?: string, status?: number) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
    this.status = status ?? AuthError.defaultStatus(code);
  }

  static defaultStatus(code: AuthErrorCode): number {
    switch (code) {
      case "unauthenticated":
      case "invalid_session":
        return 401;
      case "forbidden":
      case "csrf_invalid":
        return 403;
      case "unsafe_redirect":
        return 400;
      default:
        return 401;
    }
  }

  /** Safe for client responses — no secrets or internal details. */
  toJSON(): { code: AuthErrorCode; message: string } {
    return { code: this.code, message: this.message };
  }
}
