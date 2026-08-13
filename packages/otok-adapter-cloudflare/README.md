# otok-adapter-cloudflare

Cloudflare Workers deployment adapter for [Otok](https://github.com/kamod-ch/otok).

## Usage

```ts
import { defineConfig } from "@kamod-ch/otok";
import cloudflare from "otok-adapter-cloudflare";

export default defineConfig({
  adapter: cloudflare({
    outDir: "dist",
    wranglerName: "my-otok-app",
  }),
});
```

## Features

- Worker-compatible SSR bundle (`ssr.target: webworker`)
- Web-standard APIs only in the worker output
- Generates `wrangler.toml` with Workers Assets binding
- Typed bindings via Wrangler env (extend with `envSchema` in custom plugins)
- No Node-only imports in the worker bundle

## Deploy

```bash
pnpm build
pnpm exec wrangler deploy
```

See `examples/adapters/cloudflare/`.

## Capabilities

`ssr`, `streaming`, `middleware`, `server-actions`, `islands`, `static-assets`, `env-bindings`, `worker-fetch`

**Not available:** `node-apis`, `filesystem`, `process-env`, `graceful-shutdown`
