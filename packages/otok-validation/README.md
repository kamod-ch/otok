# @kamod-ch/otok-validation

Standard Schema validation for [Otok](https://github.com/kamod-ch/otok) — typed inputs, field/form errors, and `defineAction` integration. Works with Zod, Valibot, and ArkType without forcing a schema library in Otok core.

## defineAction with schema

```ts
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { contactSchema } from "./schemas/contact";

export const action = defineAction({
  schema: contactSchema,
  handler: async ({ input, db }) => {
    return db.insertInto("contacts").values(input).executeTakeFirstOrThrow();
  },
});
```

Input is automatically parsed from `FormData` (HTML forms) or JSON (`Content-Type: application/json`).

## Manual parsing

```ts
import { parseFormData, parseJson, parseParams } from "@kamod-ch/otok-validation";

const input = await parseFormData(formData, contactSchema);
const body = await parseJson(request, contactSchema);
const { id } = await parseParams(params, z.object({ id: z.coerce.number() }));
```

## Error format

All parsers throw Otok `validationError()` with a consistent shape:

```ts
{
  status: 400,
  message: "Validation failed",
  fieldErrors: { email: ["Invalid email address"] },
  formErrors?: ["Root-level error"],
  values?: { email: "bad", name: "Ada" }  // safe redisplay values
}
```

Use `actionData.fieldErrors` and `actionData.values` in your page component for progressive enhancement.

## Schema libraries

All libraries implementing [Standard Schema V1](https://github.com/standard-schema/standard-schema) work natively:

| Library  | Import |
|----------|--------|
| Zod 4+   | Pass schema directly |
| Valibot  | `@kamod-ch/otok-validation/adapters/valibot` |
| ArkType  | `@kamod-ch/otok-validation/adapters/arktype` |

Legacy Zod 3 `safeParse` schemas are also supported.

## Client-side validation

Same contract on server and client — no schema library in Otok core:

```ts
import { safeValidate } from "@kamod-ch/otok-validation/client";

const result = await safeValidate(contactSchema, formValues);
if (!result.success) {
  showErrors(result.fieldErrors);
}
```

## Unknown fields

Pass `stripUnknown: true` in parse options to remove fields not defined in your schema before validation.
