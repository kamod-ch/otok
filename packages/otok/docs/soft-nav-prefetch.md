# Soft navigation prefetch

Otok prefetches same-origin HTML on link hover when `softNav.prefetch !== false`.

## Cache entries

Each stored prefetch records:

- fetch time and TTL (default 30s, or `Cache-Control: max-age`)
- final URL after redirects (used for `history.pushState`, not the hover URL)
- prefetch generation and scope epoch (invalidation)

Entries are **not** stored when the response has `Cache-Control: no-store` / `no-cache`, `private`, or `Vary: Cookie` / `Authorization`.

## Limits

- At most 10 cached documents (FIFO eviction)
- At most 3 concurrent prefetch requests
- In-flight deduplication per normalized URL key

## Invalidation

Call `invalidateSoftNavPrefetch()` after local changes that HTML prefetch cannot know about, or rely on automatic clears after:

- successful data mutations (`submitMutation`)
- successful progressive form navigation (`submitSoftNavigationFormResult`)

Use `setSoftNavPrefetchScope({ authEpoch, tenantId, locale })` when identity, tenant, or locale changes; any change clears the cache and bumps the scope epoch so late prefetches are discarded.

```ts
import { invalidateSoftNavPrefetch, setSoftNavPrefetchScope } from "@kamod-ch/otok/client";

setSoftNavPrefetchScope({ authEpoch: user.id, tenantId, locale });
invalidateSoftNavPrefetch({ reason: "manual" });
```

## Navigation

Live navigations consume a fresh prefetch entry only when generation and scope match and TTL has not expired. Otherwise a new `fetch` runs. Cross-origin redirect targets are rejected.

Link clicks save scroll position before navigation; back/forward restores saved positions; URLs with a hash scroll to the target element when present.
