import type { JsonValue, ValidationErrorInput } from "otok/shared";
import type { ParseableError, ParseIssue } from "./types.js";

export function issuesToFieldErrors(
  issues: ReadonlyArray<ParseIssue>,
): Pick<ValidationErrorInput, "fieldErrors" | "formErrors"> {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    const segments = issue.path.filter((segment) => typeof segment === "string" || typeof segment === "number");
    if (segments.length === 0) {
      formErrors.push(issue.message);
      continue;
    }

    const key = segments.map(String).join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    formErrors: formErrors.length > 0 ? formErrors : undefined,
  };
}

export function zodErrorToValidationInput(
  error: ParseableError,
  values?: Record<string, JsonValue>,
): ValidationErrorInput {
  if (typeof error.flatten === "function") {
    const flattened = error.flatten();
    const fieldErrors: Record<string, string[]> = {};

    for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
      if (!messages) continue;
      fieldErrors[field] = Array.isArray(messages) ? [...messages] : [messages];
    }

    return {
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formErrors: flattened.formErrors.length > 0 ? [...flattened.formErrors] : undefined,
      values,
    };
  }

  return {
    ...issuesToFieldErrors(error.issues),
    values,
  };
}
