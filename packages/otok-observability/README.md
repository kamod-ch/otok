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
plugins: [security(), observability(), i18n(), auth(), seo()];
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

### Request URL sanitization

`sanitizeRequestPath()` (from `@kamod-ch/otok/shared` or `@kamod-ch/otok-observability`) strips query strings, URL fragments, and credentials from request URLs before they appear in logs or error reports. Known auth paths (for example `/invite/:token`, `/auth/:provider/callback`) are normalized to route templates; high-entropy path segments on unknown routes are replaced with `:redacted`. When the Otok handler has matched a route, observability logs the route pattern instead of the raw pathname.

On parse or validation failure the path becomes `/[url-unavailable]` — the original URL is never used as a fallback.

**Limits:** Static path segments on custom token routes are only masked when they match built-in templates or heuristics (length/entropy). Add app-specific templates via route patterns on the Hono context (`OTOK_MATCHED_ROUTE_PATTERN_KEY`) or pass `routePattern` to `sanitizeRequestPath`. OpenTelemetry HTTP instrumentation that bypasses this helper may still emit raw URLs unless configured to use `sanitizeOpenTelemetryRequestUrl`.

## API

| Export                          | Purpose                |
| ------------------------------- | ---------------------- |
| `observability()`               | Plugin factory         |
| `defineLoader` / `defineAction` | Traced handlers        |
| `createJsonLogger`              | Structured JSON logger |
| `createRedactor`                | Privacy filters        |
| `createOtelTracer`              | OTEL bridge            |
| `createMemoryTracer`            | In-process dev tracer  |
| `recordRenderDuration`          | SSR timing hook        |
