# Production hardening guide

## Content safety

Comments are stored as **normalized restricted markdown** (`processCommentBodyForStorage`). The server renders a safe subset (bold, italic, inline code, links). Link schemes: `http`, `https`, `mailto` only. External links get `rel="noopener noreferrer nofollow ugc"`.

Rejected at write time: HTML tags, disallowed URL schemes, excess length (Unicode code points after NFC), bidi override characters.

## Rate limiting

Implement `RateLimitProvider` (see `createCapabilityRateLimiter` in `@kamod-ch/otok-discussions` exports) or a distributed provider.

| Capability | Default window | Default max |
|------------|----------------|-------------|
| `comment:create` | 60s | 30 |
| `thread:create` | 60s | 10 |
| `reaction:mutate` | 60s | 120 |
| `report:create` | 60s | 20 |
| `moderation:apply` | 60s | 200 |

Primary key: **verified actor id**. Optional anonymous bucket uses a short-lived hashed fingerprint — not authentication.

## HTML cache (Otok)

Bundled plugin routes default to **`noStore`** until you opt in with `createDiscussions({ publicPageCache: true })`.

When opt-in is enabled, public discussion GET routes declare:

- `cache.public: true` with short `maxAge` / `sMaxAge` for **anonymous** requests only.
- Otok forces **private** or skips shared server cache when session/auth cookies are present.
- Query dimensions (`sort`, `cursor`, …) are part of the cache key (`buildCacheKeyFromContext`).
- Host apps should call `setOtokCacheScope(c, { tenantId, userId, locale })` from **verified** session data.

**Moderation routes**: always `noStore`.

### Invalidation

After comment, reaction, or moderation mutations, call:

```ts
import { revalidatePath, revalidateTag } from "@kamod-ch/otok/server";
import { buildThreadCacheInvalidation } from "@kamod-ch/otok-discussions";

const { tags, paths } = buildThreadCacheInvalidation(basePath, subject);
await Promise.all([...tags.map((t) => revalidateTag(t)), ...paths.map((p) => revalidatePath(p))]);
```

Or pass `cacheInvalidation` into `createDiscussions()`:

```ts
cacheInvalidation: {
  revalidateTags: (tags) => Promise.all(tags.map(revalidateTag)),
  revalidatePaths: (paths) => Promise.all(paths.map(revalidatePath)),
},
```

**Fallback when tags are unreliable**: path revalidation alone is supported; do not assume thread-level tags without host wiring.

## Events & queue

- Sync `EventSink.emit` uses minimal payloads (`events/payloads.ts`) and **2s timeout** — failures are logged (redacted) and do not fail the mutation.
- Heavy work: enqueue jobs via `@kamod-ch/otok-queue` (`capabilities.idempotency`, `idempotencyKey` on enqueue) from your event subscriber.

## Logging & metrics

Use `redactDiscussionLogRecord` before structured logs. Never log: comment bodies, report details, session tokens, raw IPs.

Optional `DiscussionsMetrics` on `createDiscussions({ metrics })` records counters/timings without PII.
