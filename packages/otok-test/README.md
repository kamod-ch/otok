# @kamod-ch/otok-test

Official testing utilities for Otok applications (`otok-test`).

`@kamod-ch/otok-test` uses Otok's real server handler and Hono's in-memory `app.request()` API. It does not start Vite, does not open a network port, and does not implement a second router.

## Install

```bash
pnpm add -D @kamod-ch/otok-test vitest
```

Optional client helpers (hydration and soft navigation) need `jsdom` in Vitest:

```bash
pnpm add -D jsdom
```

## Quick start

```ts
import { createOtokTestApp, authenticatedSession } from "@kamod-ch/otok-test";

const app = await createOtokTestApp({
  routes: [
    {
      path: "/dashboard",
      loader: () => ({ ok: true }),
      component: ({ data }) => <p>{String(data.ok)}</p>,
    },
  ],
  plugins: [],
});

const response = await app.get("/dashboard", {
  session: authenticatedSession,
});

expect(response.status).toBe(200);
await app.cleanup();
```

## API overview

| Area | Exports |
| --- | --- |
| Test client | `createOtokTestApp`, `OtokTestApp`, `OtokTestResponse` |
| Legacy helpers | `createTestApp`, `requestRoute`, `renderRoute`, `renderParsedRoute` |
| Routes | `createTestRoute` |
| Assertions | `expectRedirect`, `expectValidationError`, `expectValidationDocument` |
| Sessions | `createTestSession`, `authenticatedSession`, `sessionCookieHeader` |
| Islands / SSR | `getIslands`, `expectIsland`, `expectSsrPageMarker`, `parseHtml` |
| Plugins | `createPluginTestApp`, `resolvePluginTestConfig` |
| i18n | `createI18nTestContext`, `expectLocale`, `prefixedLocalePath` |
| Adapters | `@kamod-ch/otok-test/adapter` → `assertAdapterContract` |
| Client (jsdom) | `@kamod-ch/otok-test/client` → `hydrateTestPage`, `softNavigateTestPage` |
| Database hooks | `withTestDatabase`, `createDatabaseTestHooks` |
| Type tests | `Expect`, `AssertEqual`, `expectTypeOf` |

## Subpath exports

```ts
import { hydrateTestPage } from "@kamod-ch/otok-test/client";
import { assertAdapterContract } from "@kamod-ch/otok-test/adapter";
```

## Scope

Use `@kamod-ch/otok-test` for server-side tests of loaders, actions, middleware, redirects, validation failures, SSR HTML, headers, cookies, plugin wiring, and adapter contracts.

Use Playwright for full browser coverage when you need real layout, focus management, or multi-tab behavior.
