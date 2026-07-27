# Validation

`@kamod-ch/otok-validation` validates route action inputs using [Standard Schema V1](https://github.com/standard-schema/standard-schema) — compatible with Zod, Valibot, and ArkType without forcing a schema library in Otok core.

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

Input is parsed automatically:

- **HTML forms** → `FormData` (progressive enhancement)
- **JSON APIs** → `Content-Type: application/json`
- **Route params** → use `parseParams(params, schema)` in loaders

## Error display

Validation failures throw Otok `validationError()` with a consistent shape:

```ts
{
  status: 400,
  message: "Validation failed",
  fieldErrors: {
    email: ["Invalid email address"],
    name: ["Name is required"],
  },
  values: { email: "bad", name: "" },  // safe redisplay
}
```

In your page component:

```tsx
export default function NewContact({ actionData }) {
  const failure = actionData;
  const values = failure?.values ?? {};

  return (
    <form method="post">
      <input name="email" value={values.email ?? ""} aria-invalid={Boolean(failure?.fieldErrors?.email)} />
      {failure?.fieldErrors?.email?.map((e) => <p role="alert">{e}</p>)}
    </form>
  );
}
```

Field errors map to form fields. Form-level errors (no path) appear in `formErrors`.

## Schema libraries

| Library | Usage |
|---------|-------|
| Zod 4+ | Pass schema directly |
| Valibot | Pass schema directly (Standard Schema native) |
| ArkType | Wrap with `fromArkType()` from `@kamod-ch/otok-validation/adapters/arktype` |
| Zod 3 | Supported via legacy `safeParse` interface |

## Client-side validation

Same contract on server and client:

```ts
import { safeValidate } from "@kamod-ch/otok-validation/client";

const result = await safeValidate(contactSchema, formValues);
if (!result.success) showErrors(result.fieldErrors);
```

## Options

```ts
parseFormData(formData, schema, {
  status: 422,           // HTTP status (400 or 422)
  values: true,          // include redisplay values (default: true for forms)
  stripUnknown: true,    // remove unknown fields before validation
  arrays: ["tags"],      // repeated form fields → array
  checkboxes: ["active"], // checkbox normalization
});
```

## Example

See `examples/contacts-crud` for validation integrated with Kysely CRUD routes.
