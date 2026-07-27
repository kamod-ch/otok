---
title: Create Your First Otok Plugin
section: Guides
order: 35
---
# Create your first Otok plugin

This guide walks through a minimal plugin that registers a server route.

## 1. Scaffold the package

```text
packages/my-otok-plugin/
  package.json
  src/index.ts
```

Use `@otok/plugin-hello` as a reference implementation.

## 2. Define the plugin

```ts
import { definePlugin } from "otok";

export interface MyPluginOptions {
  greeting?: string;
}

export default definePlugin<MyPluginOptions>({
  name: "my-otok-plugin",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input !== undefined && typeof input !== "object") {
        throw new Error("options must be an object");
      }
      return input ?? {};
    },
  },
  config(options) {
    return {
      env: {
        MY_GREETING: options?.greeting ?? "hello",
      },
    };
  },
  configureApp({ app }) {
    app.get("/api/my-plugin", (c) => c.json({ ok: true }));
  },
});
```

## 3. Enable it in the app

```ts
// otok.config.ts
import { defineConfig } from "otok";
import myPlugin from "my-otok-plugin";

export default defineConfig({
  plugins: [myPlugin({ greeting: "hi" })],
});
```

## 4. Apply plugins in the server entry

```ts
import { loadOtokResolvedConfig } from "virtual:otok-config";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

const app = createOtokApp({
  routes,
  ...runtime,
  configure: (app) => {
    void applyAppPlugins(app);
  },
});
```

## 5. Test the plugin

Use `@otok/test` with `resolveOtokConfig()`:

```ts
import { createTestApp } from "@otok/test";
import { resolveOtokConfig } from "otok";
import myPlugin from "my-otok-plugin";

const resolved = await resolveOtokConfig(
  { plugins: [myPlugin()] },
  { root: "/tmp", mode: "test", command: "build" },
);

const app = createTestApp({
  routes: [{ path: "/" }],
  configure: (app) => {
    void resolved.applyAppPlugins(app);
  },
});

const response = await app.request("/api/my-plugin");
```

## Server-only code

Keep Node-only imports in server hooks such as `configureApp`, `configureServer`, and `buildStart`. Do not import them from client-facing virtual modules unless the module is server-only.

## Next steps

- Add virtual modules under `virtual:otok-plugin/<plugin-name>/<id>`
- Extend typed env via `envSchema`
- Contribute official extensions as separate packages (`@otok/*`, `@kamod-ch/otok-*`)
