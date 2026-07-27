import type { ValidationSchema } from "../types.js";
import { issuesToValidationInput } from "../standard.js";

/** Wrap an ArkType type for use with otok-validation parsers. */
export function fromArkType<T>(schema: (input: unknown) => unknown): ValidationSchema<T> {
  return {
    safeParse(input: unknown) {
      const result = schema(input);
      if (result && typeof result === "object" && "summary" in result) {
        const issues = [{ message: String((result as { summary: string }).summary), path: [] as PropertyKey[] }];
        return {
          success: false as const,
          error: {
            issues,
            flatten: () => {
              const mapped = issuesToValidationInput(issues);
              return {
                fieldErrors: mapped.fieldErrors ?? {},
                formErrors: mapped.formErrors ?? [],
              };
            },
          },
        };
      }
      return { success: true as const, data: result as T };
    },
  };
}

export type { ValidationSchema };
