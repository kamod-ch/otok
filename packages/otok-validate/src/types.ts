import type { JsonValue, ValidationErrorInput } from "otok/shared";

export interface ParseIssue {
  path: PropertyKey[];
  message: string;
}

export interface ParseableSchema<TOutput> {
  safeParse(input: unknown):
    | { success: true; data: TOutput }
    | { success: false; error: ParseableError };
}

export interface ParseableError {
  issues: ReadonlyArray<ParseIssue>;
  flatten?: () => {
    fieldErrors: Record<string, string[] | string | undefined>;
    formErrors: string[];
  };
}

export interface BaseParseOptions {
  message?: string;
  status?: 400 | 422;
  /** Include submitted values in the validation failure for safe redisplay. Default: true for forms. */
  values?: boolean | Record<string, JsonValue>;
}

export type { JsonValue, ValidationErrorInput };
