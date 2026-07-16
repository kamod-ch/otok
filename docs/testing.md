# Testing Otok Apps

Otok uses two complementary test layers:

1. server-side tests with `@otok/test` and Hono `app.request()`;
2. browser E2E tests with Playwright for hydration, soft navigation, and progressive enhancement.

## Server-side tests

Use `@otok/test` when you want to verify route modules without a browser or Vite dev server.

```ts
import { createTestApp, renderRoute } from "@otok/test";

const app = createTestApp({
  routes: [
    {
      path: "/users/:id",
      component: ({ params }) => <p>User {params.id}</p>,
      loader: ({ params }) => ({ userId: params.id }),
    },
  ],
});

const { response, html } = await renderRoute(app, "/users/123");
expect(response.status).toBe(200);
expect(html).toContain("User 123");
```

Use `parseHtml` or `renderParsedRoute` for structured HTML assertions:

```ts
import { renderParsedRoute } from "@otok/test";

const { document } = await renderParsedRoute(app, "/users/123");
expect(document.getText("p")).toContain("User 123");
expect(document.getTitle()).toBeTruthy();
```

Good fits for `@otok/test`:

- loaders;
- actions;
- route params;
- route middleware;
- redirects;
- expected failures;
- not-found and error routes;
- SSR HTML;
- request headers and cookies.

Use the real Vite-generated route manifest in integration tests, or `createTestRoute()` for small unit-test fixtures. `@otok/test` does not contain a second Otok router; fixtures are converted to normal Otok route entries and then handled by the real Otok server runtime.

## Browser E2E matrix

The playground Playwright suite is organized by behavior:

```text
apps/playground/e2e/
  errors.spec.ts
  forms.spec.ts
  islands.spec.ts
  middleware.spec.ts
  navigation.spec.ts
  production.spec.ts
```

Covered flows include:

### SSR and production

- production build startup through Playwright `webServer`;
- health endpoint;
- SSR HTML route;
- hashed static asset and cache header;
- 404 behavior;
- zero-island route with no production module script.

### Progressive forms and actions

- native HTML form submission with JavaScript disabled;
- successful action redirect;
- validation failures with `aria-invalid` and `role="alert"`;
- progressive form submission with soft navigation enabled;
- submitter values;
- checkbox values;
- `_method` override for delete;
- opt-out via `data-otok-no-nav`;
- back navigation after enhanced submit.

### Soft navigation

- link navigation;
- prefetch on hover;
- page-region swaps;
- multiple `data-otok-swap` regions via layout chrome;
- title and managed head metadata updates;
- history back/forward;
- hash links;
- API links and non-Otok HTML fallback;
- server-error fallback.

### Islands

- `load`;
- `idle`;
- `visible`;
- `media`;
- `client-only`;
- multiple islands with the same component id;
- new islands after soft navigation;
- island removal after navigating to a zero-JS route;
- large props transport through JSON script blocks;
- no double hydration through interaction checks.

### Accessibility basics

- semantic headings and page titles;
- keyboard form submission;
- validation `aria-invalid`;
- validation `role="alert"`;
- focusable validation messages.

## Running tests

```bash
pnpm check
pnpm test:e2e
pnpm smoke:node
```

Playwright builds and starts the production playground server before E2E tests. Traces, screenshots, and videos are configured for failures to make CI failures actionable.

## CI artifacts

The CI workflow uploads Playwright reports and test results when E2E tests fail. Do not commit generated `test-results`, Playwright reports, or trace files.
