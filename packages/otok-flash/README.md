# @kamod-ch/otok-flash

Signed one-time flash cookies for [Otok](https://github.com/kamod-ch/otok) PRG flows.

Show SSR toasts after `redirect()` without client JavaScript or session storage.

## Install

```bash
pnpm add @kamod-ch/otok-flash hono otok
```

## Action → redirect

```ts
import { flashRedirect, flashSuccess } from "@kamod-ch/otok-flash";
import { flashConfig } from "../features/flash.js";

export async function action({ hono }: OtokActionContext) {
  await save();
  flashRedirect("/items", flashSuccess("Gespeichert"), hono, flashConfig);
}
```

## Loader or middleware → display

```ts
import { consumeFlash } from "@kamod-ch/otok-flash";
import { flashConfig } from "../features/flash.js";

export async function loader({ hono }) {
  return {
    flash: consumeFlash(hono, flashConfig),
  };
}
```

Or globally:

```ts
import { createFlashMiddleware } from "@kamod-ch/otok-flash/middleware";

export default createFlashMiddleware({
  secret: process.env.FLASH_SECRET!,
  contextKey: "flash",
});
```

Then read `hono.get("flash")` in loaders/components.

## API

| Export | Purpose |
|--------|---------|
| `setFlash(c, message, config)` | Set signed flash cookie |
| `consumeFlash(c, config)` | Read + clear cookie |
| `flashRedirect(location, message, c, config)` | Set flash and `redirect()` |
| `flashSuccess` / `flashError` / … | Message helpers |
| `createFlashMiddleware(config)` | Auto-consume on GET requests |

Flash cookies are `httpOnly`, signed with HMAC-SHA256, and expire after `maxAgeSeconds` (default 120).

## App config helper

```ts
export const flashConfig = {
  secret: process.env.FLASH_SECRET ?? "dev-only-change-me",
  cookieName: "app_flash",
  secure: () => process.env.NODE_ENV === "production",
};
```

Use a strong secret in production.
