# Otok Extension Registry — Publisher Guide

This document describes how to submit extensions, how review works, and how registry integrity is maintained.

## Registry format

The registry is versioned static JSON hosted at `registry/v1/`:

| File | Purpose |
|------|---------|
| `index.json` | Metadata, publisher list, SHA256 checksum of extensions bundle |
| `extensions.json` | Array of extension entries |

Schema version: `1.0.0` (validated with Zod in `@kamod-ch/otok-registry`).

### Extension entry fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | npm package name (e.g. `@kamod-ch/otok-kysely`) |
| `aliases` | no | CLI shortcuts (`kysely`, `otok-kysely`) |
| `description` | yes | One-line summary |
| `publisher` | yes | Publisher id from index `publishers` |
| `tier` | yes | `official` or `community` |
| `version` | yes | Current published version |
| `otokVersion` | yes | Supported Otok semver range |
| `runtime` | yes | `node`, `edge`, `static` |
| `adapters` | yes | `node`, `cloudflare`, `static` |
| `capabilities` | no | Tags for search (`database`, `auth`, …) |
| `docs` | no | Documentation URL |
| `repository` | no | Source repository URL |
| `license` | yes | SPDX identifier |
| `maintenanceStatus` | yes | `active`, `maintenance`, `deprecated`, `abandoned` |
| `qualityStatus` | yes | `verified`, `unverified`, `experimental` |
| `securityNotes` | no | User-facing security guidance |
| `deprecated` | yes | Boolean flag |
| `deprecationMessage` | no | Human-readable deprecation text |
| `successor` | no | Recommended replacement package |
| `publishedAt` | yes | ISO 8601 timestamp |
| `keywords` | no | Search keywords |

## Checksum and integrity

After editing `extensions.json`, regenerate the index checksum:

```bash
pnpm --filter @kamod-ch/otok-registry registry:checksum
```

The CLI rejects bundles whose SHA256 does not match `index.json.checksum`. This provides tamper detection for cached and remote copies.

## Submission workflow

1. **Open a PR** adding your entry to `registry/v1/extensions.json`.
2. **Publisher record** — add or reference your publisher in `index.json` (`verified: false` initially).
3. **Review** — maintainers verify package ownership, semver accuracy, and security notes.
4. **Merge** — checksum is updated; registry is published with the next `@kamod-ch/otok-registry` release.

Official `@kamod-ch/*` packages use the `kamod-ch` verified publisher.

## Verified publisher process

To become verified:

- Demonstrate npm package ownership (provenance or maintainer access)
- Provide accurate `otokVersion`, adapter, and runtime metadata
- Include security notes for secrets, credentials, or privileged APIs
- Keep `maintenanceStatus` current

Verified publishers show `(verified)` in `otok info` and `✓` in `otok search`.

## Deprecation process

1. Set `deprecated: true` and `maintenanceStatus: "deprecated"`.
2. Add `deprecationMessage` explaining why.
3. Set `successor` to the replacement package name.
4. Keep the entry for at least one major Otok cycle so `otok doctor` and `otok outdated` can guide migrations.

Do not remove deprecated entries immediately — clients rely on them for migration warnings.

## Abuse protection

- **Checksum verification** on every load
- **Review policy** linked from `index.json.reviewPolicyUrl`
- **Abuse contact** in `index.json.abuseContact`
- **Tier separation** — community entries require explicit `--community` filter in strict CI pipelines (optional)
- **Unverified warnings** in CLI compatibility output

Report suspicious entries to the abuse contact listed in the registry index.

## Local development

```bash
pnpm --filter @kamod-ch/otok-registry build
pnpm --filter @kamod-ch/otok-registry test
pnpm --filter otok-cli build
OTOK_REGISTRY_OFFLINE=1 otok search storage
```

Point to a custom host:

```bash
OTOK_REGISTRY_URL=https://cdn.example.com/otok/registry/v1/ otok search storage
```

Both `index.json` and `extensions.json` must be served from that base URL.
