# @kamod-ch/otok-validate

Zod validation helpers for [Otok](https://github.com/kamod-ch/otok) route actions and Hono API handlers.

This package is **composition, not a plugin**. It maps Zod results to Otok's `validationError()` so actions can stay small and consistent.

## Install

```bash
pnpm add @kamod-ch/otok-validate otok zod
```

## Route actions (FormData)

```ts
import { redirect, type OtokActionContext } from "otok/server";
import { parseFormData } from "@kamod-ch/otok-validate";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export async function action({ formData, hono }: OtokActionContext) {
  const input = parseFormData(formData, loginSchema);
  const user = await authenticate(input.email, input.password);
  if (!user) {
    // business rule failures stay in your app code
    fail(401, { formErrors: ["Invalid credentials"] });
  }
  await createSession(hono, user.id);
  redirect("/", 303);
}
```

On validation failure, `parseFormData` throws Otok's `validationError()` with:

- `fieldErrors` from Zod
- `values` for safe redisplay in the route component

### Form options

```ts
parseFormData(formData, schema, {
  arrays: ["tags"],          // repeated keys -> string[]
  checkboxes: ["remember"],  // missing -> false, "on" -> true
  status: 422,
  message: "Please fix the highlighted fields.",
  values: false,             // omit submitted values from the failure
});
```

## JSON APIs

```ts
import { parseJson, parseJsonValue } from "@kamod-ch/otok-validate/json";

app.post("/api/posts", async (c) => {
  const input = await parseJson(c.req.raw, createPostSchema);
  // ...
});

const payload = parseJsonValue(await c.req.json(), updatePostSchema);
```

## Low-level helpers

```ts
import {
  formDataToRecord,
  issuesToFieldErrors,
  zodErrorToValidationInput,
  toJsonValues,
} from "@kamod-ch/otok-validate";
```

Use these when you need custom parsing but still want Otok-compatible error shapes.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-validate` | Re-exports |
| `@kamod-ch/otok-validate/form` | `parseFormData`, `formDataToRecord` |
| `@kamod-ch/otok-validate/json` | `parseJson`, `parseJsonValue` |

## Design notes

- Works with Zod 3 and 4 via duck-typed `safeParse` / `issues`.
- Does not add validation to Otok core.
- Business/auth failures (`fail`, `redirect`) remain in app code.
- File uploads are passed through as filenames in `values` for redisplay metadata only.

## Related packages

| Package | Status | Purpose |
|---------|--------|---------|
| `@kamod-ch/otok-auth` | shipped | Sessions, CSRF, auth middleware |
| `@kamod-ch/otok-validate` | this package | Zod → `validationError()` |
| `@kamod-ch/otok-auth/adapters/*` | planned | Reusable session adapters (see `docs/extension-roadmap.md`) |
