# Deployment (Node)

## Build

```bash
pnpm install
pnpm db:migrate
pnpm build
pnpm start
```

Der Node-Adapter schreibt nach `dist/server/server.js` (Port 5173, konfigurierbar in `otok.config.ts`).

## Umgebungsvariablen (Production)

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Min. 32 Zeichen |
| `APP_URL` | Öffentliche URL (OAuth redirects, Stripe return URLs) |
| `STRIPE_SECRET_KEY` | Live/Test Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_TEAM` | Stripe Price IDs |
| `MAIL_FROM` | Absender für Transaktions-Mails |
| `RESEND_API_KEY` oder SMTP | Production Mail (statt Test-Provider) |

## Docker Postgres

```bash
docker compose up -d postgres
```

Port **5434** (lokal), Datenbank `saas_reference`.

## Health & Observability

Das Observability-Plugin mountet Standard-Routen (Metrics/Health — siehe `@kamod-ch/otok-observability` README).

## Sicherheit

- `security()` mit `strict: true` in Production empfohlen
- `trustedHosts` auf Ihre Domain setzen
- HTTPS erzwingen (`secure` Session-Cookies)
