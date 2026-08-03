import type { ZodError } from "zod";

export class ContentValidationError extends Error {
  readonly file: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(file: string, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(`otok-content: ${message}`);
    this.name = "ContentValidationError";
    this.file = file;
    this.fieldErrors = fieldErrors;
  }
}

export function formatZodError(file: string, error: ZodError): ContentValidationError {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    fieldErrors[path] = fieldErrors[path] ?? [];
    fieldErrors[path].push(issue.message);
  }
  const detail = error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
  return new ContentValidationError(file, `Invalid frontmatter in ${file} — ${detail}`, fieldErrors);
}

export class DuplicateSlugError extends Error {
  constructor(
    readonly collection: string,
    readonly slug: string,
    readonly files: string[],
  ) {
    super(
      `otok-content: duplicate slug "${slug}" in collection "${collection}": ${files.join(", ")}`,
    );
    this.name = "DuplicateSlugError";
  }
}
