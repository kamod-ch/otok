# Opt-in Telemetry

Otok telemetry is **disabled by default** and requires explicit opt-in.

## Principles

- No telemetry without user consent
- Open documentation of all collected fields
- No PII, no file contents, no env var values
- Local-only mode always available

## Enabling

```bash
export OTOK_TELEMETRY=1
# optional: anonymous install id (generated once, stored locally)
export OTOK_TELEMETRY_ID=<uuid>
```

In projects, add to `otok.config.ts` (future):

```ts
export default defineConfig({
  telemetry: { enabled: true },
});
```

## Data collected (when enabled)

| Field | Purpose | Example |
|-------|---------|---------|
| `event` | Event name | `cli.doctor`, `cli.upgrade` |
| `otokVersion` | Compatibility | `1.0.0` |
| `nodeVersion` | Support matrix | `22.11.0` |
| `adapter` | Deployment stats | `node` |
| `pluginCount` | Ecosystem usage | `3` |
| `durationMs` | Performance | `120` |
| `success` | Reliability | `true` |
| `telemetryId` | Deduplication (optional UUID) | `a1b2...` |

## Never collected

- Source code, routes, or filenames
- Environment variable names or values
- User identities, emails, IP addresses (CLI batch mode)
- Database contents

## Transmission

When enabled, events POST to `https://telemetry.otok.dev/v1/events` (placeholder — not active until 1.0 GA).
Until then, events log to stderr in debug mode only:

```bash
OTOK_TELEMETRY=1 OTOK_TELEMETRY_DEBUG=1 otok doctor
```

## Disabling

Default: off. Set `OTOK_TELEMETRY=0` to force disable.

## Implementation

Telemetry hooks live in `packages/otok-cli/src/telemetry.ts` (no-op unless opted in).

## GDPR / privacy

Telemetry ID is random UUID stored in `~/.config/otok/telemetry-id`. Delete the file to reset.
No personal data processed.
