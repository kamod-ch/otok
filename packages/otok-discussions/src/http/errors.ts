import { fail, validationError } from "@kamod-ch/otok/server";
import { DiscussionError } from "../types/errors.js";

export function httpStatusForDiscussionError(code: DiscussionError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
    case "SUBJECT_DENIED":
    case "ACTOR_REQUIRED":
      return 403;
    case "INVALID_INPUT":
    case "INVALID_CURSOR":
    case "INVALID_TRANSITION":
      return 422;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    default:
      return 400;
  }
}

export function rethrowDiscussionError(error: unknown): never {
  if (error instanceof DiscussionError) {
    const status = httpStatusForDiscussionError(error.code);
    if (status === 422) {
      validationError({ formErrors: [error.message] }, 422);
    }
    fail(status, { message: error.message, formErrors: [error.message] });
  }
  throw error;
}

export function discussionsValidationFail(errors: {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  values?: Record<string, string>;
}): never {
  validationError(errors, 422);
}

export function discussionsForbidden(message = "Forbidden"): never {
  fail(403, { message, formErrors: [message] });
}

export function discussionsNotFound(message = "Not found"): never {
  fail(404, { message });
}

export function jsonErrorBody(code: string, message: string, extra?: Record<string, unknown>) {
  return { code, message, ...extra };
}
