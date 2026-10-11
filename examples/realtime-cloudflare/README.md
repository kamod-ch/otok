# realtime-cloudflare

Private Workers example for `@kamod-ch/otok-realtime/cloudflare` (Plan 036).

## Scripts

```bash
pnpm --filter @kamod-ch/otok-realtime build
pnpm --filter realtime-cloudflare test   # wrangler dev + node integration tests (real DO storage)
pnpm --filter realtime-cloudflare smoke  # wrangler deploy --dry-run
```

From repo root: `pnpm check:realtime-cloudflare`.

## Env (wrangler.toml vars)

- `REALTIME_INTERNAL_SECRET` — Worker ↔ DO internal header
- `REALTIME_PUBLISH_SECRET` — publish API trust

No WebSocket/presence in this MVP.
