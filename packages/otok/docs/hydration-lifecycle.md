# Island hydration lifecycle

Otok hydrates islands from SSR markers (`data-otok-island`). Supported strategies: `load`, `idle`, `visible`, `media`, and `client-only` (emitted as `load` on the client).

## Soft navigation

1. Pending schedules (idle, `IntersectionObserver`, `matchMedia`) are cancelled and their promises settle.
2. Hydrated roots inside replaced `[data-otok-page]` or `[data-otok-swap]` regions are unmounted with Preact `render(null, element)`.
3. DOM swap runs inside `document.startViewTransition` when available and `prefers-reduced-motion` is not `reduce`.
4. Only **eager** islands (`load`, and strategies with no async gate) block navigation completion.
5. **Deferred** islands continue hydrating in the background; a newer navigation invalidates in-flight module loads via a generation counter.

Islands outside swapped regions (persistent layout chrome) stay mounted.

## Nesting

Only **top-level** island markers in a subtree are scheduled. A `data-otok-island` inside another island’s SSR shell is ignored until the parent is hydrated through its own component tree (no extra nesting support).

## Initial page load

`createOtokClient()` calls `hydrateIslands()` without a navigation generation, so every strategy is scheduled as today.

Apps consume `@kamod-ch/otok` from `dist/`; rebuild the package after core changes so the client bundle includes updated hydration code. The Otok Vite plugin dedupes `preact`, `preact/hooks`, and `preact/compat` so island chunks share one runtime with the framework.

## Cancellation

`cancelPendingHydration(root)` and the internal `otok:cancel-hydration` event abort observers, idle callbacks, and media listeners. Scheduling promises always resolve (including on import failure when `onError` is provided).
