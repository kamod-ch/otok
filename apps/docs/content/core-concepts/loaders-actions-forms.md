---
title: Loaders, Actions, and Forms
section: Core Concepts
order: 12
---
# Loaders, Actions, and Forms

Loaders return data for SSR. Actions handle mutations from `POST`, `PUT`, `PATCH`, and `DELETE` requests.

```tsx
import { fail, redirect, type OtokActionContext, type OtokPageProps } from "otok/server";

export const loader = () => ({ projects: [] });

export async function action({ formData }: OtokActionContext) {
  const name = String(formData?.get("name") ?? "").trim();
  if (!name) {
    fail(400, {
      message: "Validation failed",
      fieldErrors: { name: ["Name is required"] },
    });
  }
  redirect("/projects", 303);
}

export default function ProjectForm({ actionData }: OtokPageProps) {
  const result = actionData as { fieldErrors?: Record<string, string[]> } | undefined;
  return (
    <form method="post">
      <input name="name" aria-invalid={Boolean(result?.fieldErrors?.name)} />
      {result?.fieldErrors?.name?.map((error) => <p role="alert">{error}</p>)}
      <button>Save</button>
    </form>
  );
}
```

Forms work without JavaScript. Progressive enhancement is optional:

```ts
createOtokClient({ registry: islandModules, softNav: { forms: true } });
```

Otok does not automatically solve CSRF. Add CSRF protection for cookie-authenticated apps.
