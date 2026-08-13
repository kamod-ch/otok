# Deployment adapters

Otok ships explicit deployment adapters comparable to SvelteKit's adapter model, tailored to the Hono + Preact SSR and islands architecture.

## Configuration

```ts
import { defineConfig } from "@kamod-ch/otok";
import node from "otok-adapter-node";

export default defineConfig({
  adapter: node({
    outDir: "dist",
  }),
});
```

## Official adapters

| Package | Runtime | Use case |
| --- | --- | --- |
| `otok-adapter-node` | Node.js | Standalone server, Docker, systemd |
| `otok-adapter-cloudflare` | Cloudflare Workers | Edge SSR with Workers Assets |
| `otok-adapter-static` | Static hosting | Prerendered HTML + client islands |

## Capability checks

Plugins can assert runtime capabilities and emit readable errors:

```ts
import { definePlugin, assertAdapterCapability } from "@kamod-ch/otok";

export default definePlugin({
  name: "my-node-cache",
  configResolved(ctx) {
    assertAdapterCapability(ctx.adapter, "node-apis", "my-node-cache stores sessions on disk");
  },
});
```

When the active adapter is Cloudflare Workers, this fails with a message naming the missing capability and the active adapter.

## Examples

Minimal adapter examples live under `examples/adapters/`:

- `examples/adapters/node`
- `examples/adapters/cloudflare`
- `examples/adapters/static`

## Third-party adapters

See [Creating custom adapters](./creating-adapters.md).
