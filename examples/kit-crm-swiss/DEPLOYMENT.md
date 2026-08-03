# Deployment — Swiss CRM Reference

## Requirements

- Node.js 20+
- PostgreSQL 16+
- Environment variables (see `.env.example`)

## Docker (development)

```bash
docker compose up -d postgres
pnpm db:migrate && pnpm db:seed
pnpm dev          # Vite dev server
# or
pnpm build && pnpm start   # Node adapter production
```

## Production (Node adapter)

1. Provision PostgreSQL and set `DATABASE_URL`
2. Set `AUTH_SECRET` (32+ chars, random)
3. Set `APP_URL` to public origin
4. Run migrations: `pnpm db:migrate`
5. Seed once: `pnpm db:seed`
6. Build: `pnpm build`
7. Start: `pnpm start` (listens on port 3010 via adapter config)

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Session signing secret |
| `APP_URL` | Public URL for auth redirects |
| `OTOK_LOCALE` | Default locale (de/fr/en/it) |

## Security checklist

- Use strong `AUTH_SECRET` in production
- Replace dev login with password/OAuth before public deployment
- Enable HTTPS and secure cookies via reverse proxy
- Restrict database network access

## Cloudflare / edge

PostgreSQL-backed CRM requires Node adapter today. Edge deployment needs D1/Hyperdrive migration (tracked as framework gap — see `docs/framework-friction.md`).
