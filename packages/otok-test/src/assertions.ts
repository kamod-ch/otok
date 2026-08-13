import type { OtokFailure } from "@kamod-ch/otok/server";
import type { ParsedHtml } from "./html.js";

export interface RedirectExpectation {
  location: string;
  status?: number;
}

export interface ValidationExpectation {
  status?: 400 | 422;
  message?: string;
  fieldErrors?: Record<string, string | string[]>;
  formErrors?: string[];
}

export function expectRedirect(response: Response, expectation: RedirectExpectation | string): void {
  const resolved = typeof expectation === "string" ? { location: expectation } : expectation;
  if (response.status < 300 || response.status > 399) {
    throw new Error(`Expected redirect but received status ${response.status}.`);
  }
  if (resolved.status !== undefined && response.status !== resolved.status) {
    throw new Error(`Expected redirect status ${resolved.status} but received ${response.status}.`);
  }
  const location = response.headers.get("location");
  if (location !== resolved.location) {
    throw new Error(`Expected redirect to "${resolved.location}" but received "${location ?? ""}".`);
  }
}

export async function readValidationFailure(response: Response): Promise<OtokFailure | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.clone().json()) as OtokFailure;
  }
  return null;
}

export function expectValidationError(
  response: Response,
  html: string,
  expectation: ValidationExpectation = {},
): void {
  const status = expectation.status ?? 400;
  if (response.status !== status) {
    throw new Error(`Expected validation status ${status} but received ${response.status}.`);
  }

  if (expectation.message && !html.includes(expectation.message)) {
    throw new Error(`Expected validation message "${expectation.message}" in HTML response.`);
  }

  if (expectation.formErrors) {
    for (const error of expectation.formErrors) {
      if (!html.includes(error)) {
        throw new Error(`Expected form error "${error}" in HTML response.`);
      }
    }
  }

  if (expectation.fieldErrors) {
    for (const [field, errors] of Object.entries(expectation.fieldErrors)) {
      const list = Array.isArray(errors) ? errors : [errors];
      for (const error of list) {
        if (!html.includes(error)) {
          throw new Error(`Expected field error for "${field}": "${error}" in HTML response.`);
        }
      }
      if (!html.includes(`name="${field}"`) && !html.includes(`name='${field}'`)) {
        throw new Error(`Expected input for field "${field}" in validation response HTML.`);
      }
    }
  }
}

export function expectValidationDocument(document: ParsedHtml, expectation: ValidationExpectation = {}): void {
  if (expectation.message) {
    if (!document.contains(expectation.message)) {
      throw new Error(`Expected validation message "${expectation.message}" in parsed HTML.`);
    }
  }

  if (expectation.fieldErrors) {
    for (const field of Object.keys(expectation.fieldErrors)) {
      const input = document.querySelector(`input[name=${field}]`) ?? document.querySelector(`[name=${field}]`);
      if (!input) {
        throw new Error(`Expected field "${field}" in validation HTML.`);
      }
      const invalid = input.getAttribute("aria-invalid");
      if (invalid !== "true") {
        throw new Error(`Expected aria-invalid="true" on field "${field}".`);
      }
    }
  }
}
