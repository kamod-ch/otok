# Creating custom Otok adapters

Third-party adapters implement the typed `OtokAdapter` contract from `@otok/config` (re-exported by `otok`).

## Minimal adapter

```ts
import { defineAdapter, createDualBuildVitePlugin } from "@otok/config";

export default defineAdapter<{ outDir?: string }>({
  name: "otok-adapter-acme",
  runtime: "acme",
  capabilities: ["ssr", "islands", "static-assets"],
  build: {
    clientEntry: "src/client.ts",
    ssrEntry: "src/server.ts",
    ssrTarget: "node",
  },
  outputDirs(options) {
    const root = options.outDir ?? "dist";
    return { root, client: `${root}/client`, server: `${root}/server` };
  },
  ssr: { supported: true },
  middleware: { supported: true },
  configureVite(ctx) {
    const outDirs = this.outputDirs(ctx.options, ctx.root);
    return createDualBuildVitePlugin({ name: this.name, outDirs, build: this.build });
  },
});
```

## Contract surface

Every adapter must declare:

1. **name** — unique package name (`otok-adapter-*`)
2. **runtime** — `node`, `cloudflare`, `static`, or a custom string
3. **capabilities** — from `OTOK_ADAPTER_CAPABILITIES`
4. **build** — Vite dual-build hints (client entry, SSR entry, target)
5. **outputDirs(options, root)** — client/server/static directories
6. **serverEntry** — optional generated entry metadata
7. **assets** — cache headers and URL strategy for static assets
8. **environment** — `processEnv`, `bindings`, optional `envSchema`
9. **prerender** / **ssr** / **middleware** — feature flags
10. **hooks** — `buildStart`, `buildEnd`, `finish`, `cleanup`

## Lifecycle

```
config resolve → adapter registered as first plugin
buildStart     → generate entries / validate routes
Vite client build
buildEnd (client)
Vite SSR build
buildEnd (server) → write deployment artifacts
finish           → prerender / post-process (SSR build only)
cleanup          → remove temporary server bundles (static adapter)
```

## Capability-driven plugins

Document which capabilities your adapter provides. Plugins should call `assertAdapterCapability(ctx.adapter, "node-apis", reason)` during `configResolved` instead of failing at runtime.

## Contract tests

Use `otok-adapter-contract` in your package tests:

```ts
import { assertAdapterContract } from "otok-adapter-contract";
import acme from "./index.js";

describe("contract", () => {
  assertAdapterContract({
    adapter: acme(),
    expected: {
      name: "otok-adapter-acme",
      runtime: "acme",
      capabilities: ["ssr", "islands", "static-assets"],
      outDirs: { root: "dist", client: "dist/client", server: "dist/server" },
    },
  });
});
```

## Publishing checklist

- Export a default factory function (`export default function acme(options) { ... }`)
- Peer-depend on `otok` and `vite`
- Depend on `@otok/config` for `defineAdapter` and Vite helpers
- Document deployment steps, environment variables, and limitations
- Provide a minimal example under `examples/` or in the package README
