import type { JsonValue, ValidationErrorInput } from "otok/shared";

/** Standard Schema V1 — cross-library validation interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1Props<Input, Output>;
}

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: string;
  validate: (
    value: unknown,
  ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  readonly types?: {
    readonly input: Input;
    readonly output: Output;
  };
}

export type StandardSchemaResult<Output> =
  | StandardSchemaSuccessResult<Output>
  | StandardSchemaFailureResult;

export interface StandardSchemaSuccessResult<Output> {
  readonly value: Output;
  readonly issues?: undefined;
}

export interface StandardSchemaFailureResult {
  readonly issues: ReadonlyArray<StandardSchemaIssue>;
  readonly value?: undefined;
}

export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey> | undefined;
}

/** Any schema Otok validation can consume. */
export type ValidationSchema<TOutput = unknown> =
  | StandardSchemaV1<unknown, TOutput>
  | LegacyParseableSchema<TOutput>;

/** Legacy safeParse-style schemas (Zod 3, custom). */
export interface LegacyParseableSchema<TOutput> {
  safeParse(input: unknown):
    | { success: true; data: TOutput }
    | { success: false; error: LegacyParseableError };
}

export interface LegacyParseableError {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
  flatten?: () => {
    fieldErrors: Record<string, string[] | string | undefined>;
    formErrors: string[];
  };
}

export interface ParseOptions {
  message?: string;
  status?: 400 | 422;
  /** Include submitted values in validation failure for safe redisplay. */
  values?: boolean | Record<string, JsonValue>;
  /** Strip unknown fields before validation. Default: false. */
  stripUnknown?: boolean;
  /** Coerce string form values (e.g. "42" → 42) when schema supports it. Default: true for forms. */
  coerce?: boolean;
}

export interface FormParseOptions extends ParseOptions {
  /** Field names that collect repeated values into a string array. */
  arrays?: string[];
  /** Checkbox fields: missing => false, "on"/"true"/"1" => true. */
  checkboxes?: string[];
  /** When set, parse this record instead of converting formData. */
  input?: Record<string, unknown>;
}

export type { JsonValue, ValidationErrorInput };
