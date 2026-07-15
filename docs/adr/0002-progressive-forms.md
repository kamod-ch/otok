# ADR 0002: Progressive Forms

## Status

Proposed for Phase 1.

## Kontext

Otok currently renders SSR HTML and hydrates opt-in islands. Soft navigation intercepts same-origin links, fetches HTML, swaps `[data-otok-page]`, patches `[data-otok-swap]`, syncs managed head elements, and hydrates new islands. It does not intercept forms or provide a form-state API.

Phase 1 requires forms that work without JavaScript and can be progressively enhanced when the client runtime is present.

## Entscheidung

Keep native HTML forms as the baseline. A form posts to the current route or an explicit route URL and is handled by the route `action` from ADR 0001. Without JavaScript the browser receives a normal redirect or re-rendered HTML response.

Add optional client enhancement to the existing soft-navigation runtime instead of requiring a new island component. The enhancement should intercept eligible same-origin forms only when enabled through `createOtokClient({ softNav: { forms: true } })` or a similarly explicit option.

Eligible forms:

- have method `get` or `post` for Phase 1;
- target the same origin;
- do not have `target`, `download`, or `data-otok-no-nav`;
- use browser-supported form encoding;
- gracefully fall back to native submission on unsupported cases.

The server contract remains HTML-first. Action errors should be visible in SSR page props so templates can render validation feedback after a native submission.

## Alternativen

1. Provide a mandatory `<Form>` component. This would make simple HTML forms less standard and would not be necessary for progressive enhancement.
2. Make all forms island-driven. This breaks no-JS behavior and increases client JavaScript.
3. Handle forms only through Hono API routes. This is flexible but misses route-local validation and re-render semantics.

## Konsequenzen

- The primary implementation dependency is route actions.
- Soft-navigation tests must cover form interception and fallback behavior.
- Pages without islands should still omit client JavaScript unless the app explicitly opts into a client entry for form enhancement.
- Documentation must explain native forms first, then enhancement.

## Kompatibilität

Backward compatible. Existing forms keep native browser behavior unless the developer opts into enhancement.

## Offene Punkte

- Whether form enhancement should be available when a page has no islands, because current production HTML omits the client module for no-island pages.
- Naming of the soft-navigation option, for example `forms`, `enhanceForms`, or `submit`.
- Whether failed enhanced submissions should replace the full page region or only emit a custom event for user code.
