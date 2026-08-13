# otok-adapter-static

Static hosting adapter for [Otok](https://github.com/kamod-ch/otok).

## Usage

```ts
import { defineConfig } from "@kamod-ch/otok";
import staticAdapter from "otok-adapter-static";

export default defineConfig({
  adapter: staticAdapter({
    outDir: "dist",
    routes: ["/marketing/landing"],
    strict: true,
  }),
});
```

## Features

- Prerenders all statically known routes at build time
- Additional routes via `routes` option
- Fails the build when route modules export `action` or `loader` (strict mode)
- Output suitable for S3, Netlify, GitHub Pages, or any static host
- Relative asset paths by default

## Capabilities

`prerender`, `islands`, `static-assets`

**Not available:** `ssr`, `middleware`, `node-apis`, `server-actions` at runtime
