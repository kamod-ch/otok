# otok-adapter-node

Node.js deployment adapter for [Otok](https://github.com/kamod-ch/otok).

## Usage

```ts
import { defineConfig } from "otok";
import node from "otok-adapter-node";

export default defineConfig({
  adapter: node({
    outDir: "dist",
    port: 3000,
    host: "0.0.0.0",
  }),
});
```

## Features

- Standalone server build (`dist/server/server.js`)
- Configurable `HOST` and `PORT` at runtime
- Immutable cache headers for hashed assets
- Graceful shutdown on `SIGTERM` / `SIGINT`
- Full Node.js environment access (`process.env`, filesystem)

## Operations

### Docker

See `examples/adapters/node/Dockerfile`.

### systemd

```ini
[Service]
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node dist/server/server.js
KillSignal=SIGTERM
```

## Capabilities

`node-apis`, `filesystem`, `process-env`, `graceful-shutdown`, `ssr`, `streaming`, `middleware`, `server-actions`, `islands`, `static-assets`
