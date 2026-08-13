---
title: Devtools
section: Guides
order: 35
---
# Devtools

`@kamod-ch/otok-devtools` adds a development-only inspector for Otok apps.

## Install

```bash
pnpm add -D @kamod-ch/otok-devtools
```

## Enable

```ts
import { defineConfig } from "@kamod-ch/otok";
import devtools from "@kamod-ch/otok-devtools";

export default defineConfig({
  plugins: [devtools()],
});
```

During `pnpm dev` the plugin exposes:

- `GET /__otok_devtools` — sanitized JSON snapshot
- a floating Preact panel injected by Vite (`apply: "serve"` only)

## Snapshot contents

- route tree with loader/action/middleware metadata
- latest request timings (middleware, loader, render)
- SSR, CSR, and island render mode markers
- redirects and validation responses
- active locale from SSR HTML
- auth status without secrets (`userId`, roles only)

## Safety rules

- keep `@kamod-ch/otok-devtools` as a dev dependency
- do not import `@kamod-ch/otok-devtools/client` from production code paths
- the panel never renders cookies, tokens, or full form payloads

See [`examples/devtools-demo`](https://github.com/kamod-ch/otok/tree/main/examples/devtools-demo).
