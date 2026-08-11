# Otok Extension Registry — User Guide

The Otok extension registry helps you discover, evaluate, and install official and community extensions with compatibility checks before they land in your project.

## CLI commands

```bash
# Search by keyword, capability, or alias
otok search storage
otok search storage --official

# Detailed registry entry
otok info otok-kysely
otok info kysely --json

# Install with compatibility warnings
otok add otok-kysely

# Check installed extensions against registry versions
otok outdated

# Diagnose project health (read-only by default)
otok doctor
otok doctor --fix   # optional safe fixes (confirmed interactively)
```

## Registry sources

The CLI resolves registry data in this order:

1. **Bundled** — shipped with `@kamod-ch/otok-registry` (always available offline)
2. **Project cache** — `.otok/cache/registry-v1.json` (24h TTL)
3. **User cache** — `~/.cache/otok/registry-v1.json`
4. **Remote** — when `OTOK_REGISTRY_URL` is set (falls back to bundled on failure)

Force offline mode:

```bash
OTOK_REGISTRY_OFFLINE=1 otok search auth
```

## Compatibility checks

Before `otok add` installs a package, the CLI checks:

- **Otok version** — `otokVersion` semver range in the registry entry
- **Adapter** — node / cloudflare / static support
- **Deprecation** — warnings and suggested successors
- **Security notes** — publisher-supplied advisories
- **Maintenance / quality** — experimental or abandoned packages

Incompatible installs require explicit confirmation in interactive terminals.

## Doctor

`otok doctor` performs read-only checks:

| Check | Description |
|-------|-------------|
| Versions | Otok and plugin versions vs registry |
| Duplicates | Same plugin registered twice in `otok.config.ts` |
| Adapters | Detected adapter package |
| Environment | `process.env.*` references without values |
| Client leaks | Server imports in `src/client` |
| Middleware order | Auth vs session ordering heuristic |
| Route types | Presence of generated `.otok/types/routes.d.ts` |
| Database | Migrations folder when Kysely is installed |
| Security | Registry security notes for installed plugins |
| Capabilities | Adapter vs plugin capability mismatches |

Use `--fix` only when you want the CLI to propose and confirm safe repairs (e.g. route typegen).

## Verified publishers

Entries from **verified** publishers display a checkmark in search results. Unverified community packages are allowed but flagged in `otok info`.

Report abuse: see `abuseContact` in the registry index (`registry/v1/index.json`).
