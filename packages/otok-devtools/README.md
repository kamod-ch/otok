# @kamod-ch/otok-devtools

Development-only diagnostics for Otok apps.

The package exposes a stable JSON feed and a minimal floating Preact panel. It never ships in production bundles and never renders secrets, cookies, tokens, or full form payloads.

## Install

Development dependency only:

```bash
pnpm add -D @kamod-ch/otok-devtools
```

## Setup

```ts
// otok.config.ts
import { defineConfig } from "@kamod-ch/otok";
import devtools from "@kamod-ch/otok-devtools";

export default defineConfig({
  plugins: [devtools()],
});
```

Run the app with `pnpm dev`. Open the **Otok Devtools** button in the bottom-right corner.

## Data source

`GET /__otok_devtools` returns a sanitized snapshot:

- route tree (loaders, actions, middleware count, CSR flag)
- latest requests with SSR / CSR / island mode
- middleware, loader, and action timings
- redirects and validation markers
- active locale and non-sensitive auth status (`userId`, roles only)
- island ids rendered on the page

## Production exclusion

- Plugin hooks run only when `mode === "development"`.
- The Vite plugin uses `apply: "serve"`.
- The client panel mounts only when `import.meta.env.DEV` is true.

Do not import `@kamod-ch/otok-devtools/client` from application code that also ships to production. Keep the plugin in `otok.config.ts` and rely on development installs only.

## Example

See [`examples/devtools-demo`](../../examples/devtools-demo).
