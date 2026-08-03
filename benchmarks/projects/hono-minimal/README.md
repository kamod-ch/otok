# Hono minimal benchmark

Raw Hono SSR equivalent to [minimal-ssr spec](../../specs/minimal-ssr.md).

## Setup

```bash
cd benchmarks/projects/hono-minimal
pnpm install
pnpm dev
```

## Verify

```bash
BENCH_URL=http://127.0.0.1:3000 node verify.mjs
```

## Notes

Hono is a router, not a full framework — compare SSR latency only, not feature parity.
