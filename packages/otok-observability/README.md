# @kamod-ch/otok-observability

Structured logging, request tracing, and error reporting for [Otok](https://github.com/kamod-ch/otok).

Privacy-safe by default: no form data, cookies, tokens, or secrets in logs.

## Install

```bash
pnpm add @kamod-ch/otok-observability hono @kamod-ch/otok
```

Optional OpenTelemetry bridge:

```bash
pnpm add @opentelemetry/api
```

## Plugin setup

```ts
import { defineConfig } from "@kamod-ch/otok";
import observability from "@kamod-ch/otok-observability";

export default defineConfig({
  plugins: [
    observability({
      requestIdHeader: "x-request-id",
      errorReporter: mySentryReporter,
    }),
  ],
});
```

## Middleware order

Register `observability()` immediately after `security()` so every downstream plugin and SSR handler runs inside a request span:

```ts
plugins: [security(), observability(), i18n(), auth(), seo()]
```

## Traced loaders and actions

```ts
import { defineLoader, defineAction } from "@kamod-ch/otok-observability/loader";

export const loader = defineLoader(async ({ hono }) => {
  return { items: await loadItems() };
});

export const action = defineAction(async ({ hono, formData }) => {
  await save(formData);
});
```

Logs include `loaderMs`, `actionMs`, and `renderMs` without serializing `formData`.

## OpenTelemetry

When `@opentelemetry/api` is installed, spans are exported through the global tracer provider:

```ts
import { createOtelTracer } from "@kamod-ch/otok-observability/otel";

observability({
  tracer: await createOtelTracer("my-app"),
});
```

Works in Node and edge runtimes that support the OTEL API (exporters configured separately).

## Error reporting

```ts
const errorReporter: ErrorReporter = {
  async capture({ error, requestId, route }) {
    await sentry.captureException(error, { tags: { requestId, route } });
  },
};
```

## Redaction

Built-in redaction covers `authorization`, `cookie`, `password`, `token`, `secret`, `_csrf`, and more. Extend with `redactKeys`.

## API

| Export | Purpose |
|--------|---------|
| `observability()` | Plugin factory |
| `defineLoader` / `defineAction` | Traced handlers |
| `createJsonLogger` | Structured JSON logger |
| `createRedactor` | Privacy filters |
| `createOtelTracer` | OTEL bridge |
| `createMemoryTracer` | In-process dev tracer |
| `recordRenderDuration` | SSR timing hook |
