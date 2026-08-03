# Rendering and Caching

Otok routes declare rendering mode, streaming, and cache policy with `defineRendering()`. The core runtime resolves a per-request render plan, applies HTTP cache headers, and delegates deployment-specific behavior to adapters.

## Route configuration

```ts
import { defineRendering } from "otok/rendering";

export const rendering = defineRendering({
  mode: "ssr",
  streaming: true,
  cache: {
    maxAge: 60,
    staleWhileRevalidate: 300,
    tags: ["companies"],
  },
});
```

### Rendering modes

| Mode | Behavior |
|---|---|
| `ssr` | Server-render on every request (default) |
| `ssg` | Static generation at build time via adapter prerender |
| `hybrid` | SSG for anonymous users, SSR when auth/session cookies are present |
| `client` | HTML shell + client bundle; loader may still run for metadata |
| `auto` | Chooses SSR vs SSG from prerender config and personalization signals |

Layout routes can export their own `rendering` config; child routes inherit merged settings.

## Streaming SSR

When `streaming: true`, Otok emits the HTML shell (`<!doctype>`, `<head>`, `<body>` start) before the body finishes. Streaming respects the incoming `AbortSignal` — disconnected clients stop body emission.

### Deferred data / loading boundaries

Slow loader regions can stream after the critical HTML without blocking TTFB:

```ts
import { defineRendering, createDeferredSlot, DeferredBoundary } from "otok/rendering";

export const rendering = defineRendering({
  mode: "ssr",
  streaming: true,
  deferred: true,
});

export async function loader() {
  const user = await db.user(); // critical — awaited before first byte
  return {
    user,
    posts: createDeferredSlot("posts", () => db.posts()), // starts now, streams later
  };
}

export default function Page({ data }) {
  return (
    <div>
      <h1>Hello {data.user.name}</h1>
      <DeferredBoundary slot={data.posts} fallback={<p>Loading…</p>}>
        {(posts) => (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        )}
      </DeferredBoundary>
    </div>
  );
}
```

Behavior:

1. Shell + HTML before the first `DeferredBoundary` stream immediately (TTFB).
2. Each deferred slot is awaited in document order; resolved markup replaces the loading marker in the stream (zero-JS sequential HTML).
3. Content after a deferred boundary waits for that slot — place slow regions lower in the page when possible.
4. `head()` / `chrome()` receive immediate placeholders only — keep SEO-critical metadata out of deferred slots.
5. `deferred: true` without `streaming: true` still resolves slots in parallel, but TTFB waits for all of them (`DEFERRED_WITHOUT_STREAMING` warning).

Auto-detection: if the loader returns `createDeferredSlot(...)` values and streaming is on, progressive streaming activates even without `deferred: true`.

## Caching

### Headers

Generated automatically from route cache config:

- `Cache-Control` with `max-age`, `s-maxage`, `stale-while-revalidate`
- `Cache-Tag` for CDN on-demand revalidation
- `Vary` when locale-sensitive

### On-demand revalidation

```ts
import { revalidatePath, revalidateTag } from "otok/server";

await revalidateTag("companies");
await revalidatePath("/companies/acme");
```

Use in route actions after mutations:

```ts
export const action = defineAction({
  handler: async ({ input }) => {
    await saveCompany(input);
    await revalidateTag("companies");
    return { ok: true };
  },
});
```

### Providers

Default: in-memory provider (single process).

Shared / edge backends (no hard Redis dependency — inject a client or use REST):

```ts
import {
  setCacheProvider,
  MemoryCacheProvider,
  RedisCacheProvider,
  createRedisRestClient,
  EdgeKvCacheProvider,
} from "otok/cache";

// Single process
setCacheProvider(new MemoryCacheProvider());

// Upstash / Redis REST
setCacheProvider(
  new RedisCacheProvider({
    client: createRedisRestClient({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
  }),
);

// Cloudflare KV (from a Worker env binding)
setCacheProvider(new EdgeKvCacheProvider({ namespace: env.OTOK_CACHE }));
```

Adapters can wire this automatically:

- Node: `node({ redisCache: true })` reads `UPSTASH_REDIS_REST_*` / `OTOK_REDIS_REST_*`
- Cloudflare: `cloudflare({ cacheKvBinding: "OTOK_CACHE" })` sets the provider per request and stubs `[[kv_namespaces]]` in wrangler.toml

Stampede protection deduplicates concurrent cache misses via `withCacheStampedeProtection`.

## Security defaults

- Authenticated or session cookie requests **never** receive public CDN cache
- `s-maxage` is stripped from personalized responses
- Validation and error responses emit `Cache-Control: no-store`
- Cache keys include locale and tenant when present

Risky configs log warnings: `CACHE_PUBLIC_WITH_AUTH`, `CACHE_SMAXAGE_PERSONALIZED`.

## Adapter responsibilities

| Concern | Core | Adapter |
|---|---|---|
| Render plan resolution | yes | — |
| Cache headers + provider API | yes | optional KV/Redis wiring |
| SSR / streaming runtime | yes | capability flag |
| Prerender execution | manifest | static adapter crawl + write HTML |
| Asset CDN headers | helper | node / cloudflare / static |

Capability checks: routes requiring `streaming` fail fast when the active adapter lacks support.

## Decision matrix

| Need | Recommended mode |
|---|---|
| Real-time dashboards, auth-gated pages | `ssr`, `cache: false` or `private` |
| Marketing pages, docs | `ssg` or `hybrid` with tags |
| Mostly static site + logged-in area | `hybrid` |
| Heavy client interactivity, minimal SEO | `client` |
| Unknown auth split at build time | `auto` or `hybrid` |

## Benchmark example

See `examples/rendering-benchmark` for a repeatable script comparing SSR, streaming SSR, and cached SSR latencies using `curl` + `hyperfine`.

```bash
cd examples/rendering-benchmark
pnpm bench
```

Measure:

1. TTFB with `streaming: true` vs buffered SSR
2. Second request latency with `cache.maxAge`
3. Revalidation latency after `revalidateTag()`
