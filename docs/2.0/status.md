# Otok 2.x — repository status

**As of:** 2026-10-11  
**Scope:** This file describes the **monorepo checkout**, not automatic npm availability or production readiness.

## Version truth

| Source | What it means |
|--------|----------------|
| `packages/otok/package.json` (`@kamod-ch/otok`) | **2.0.0** in this repository — the current framework line under active development. |
| `pnpm create otok` / template `package.json` files | Scaffold pins (for example `^2.0.0`) — verify [npm](https://www.npmjs.com/package/@kamod-ch/otok) before assuming a release exists. |
| Historical docs under `docs/1.0/` and `docs/stabilization/` | **Point-in-time evidence** from earlier stabilization work — preserved verbatim with dated banners. |

The workspace root `package.json` version (`0.1.0`) is a private meta version only; it is **not** the framework semver.

## Toolchain (from manifests)

- **Node.js:** `>=20` (`engines.node`); CI exercises 20.x and 22.x — see [node-support.md](../node-support.md).
- **pnpm:** declared in the root `package.json` `packageManager` field (currently **pnpm 12.5.1**). Use Corepack or match that major when contributing.

## Verified gates in this repo

These scripts run locally and in CI (static job) today:

- `pnpm metadata:check` — publishable package metadata
- `pnpm check:scaffold` — template sync
- `pnpm api:check` / API snapshot scripts
- `pnpm test:gates` — deterministic gate unit tests
- `pnpm docs:release:check` — active release/status doc consistency (this plan)

**Not claimed here:** full ecosystem catalog enforcement (`docs:check` from plans 014–016) unless that script is present in the root manifest — reconcile the plans index against the checkout instead of assuming DONE rows imply every artifact exists.

## Runtime and adapters

Supported deployment paths documented in-repo include Node (`otok-adapter-node`), Cloudflare Workers (`otok-adapter-cloudflare`), and static export (`otok-adapter-static`). Edge/runtime limits (native addons, long-lived DB pools) remain adapter-specific — see migration notes and adapter READMEs.

## Plugin / extension model

Otok ships a **config-time plugin registry** (`packages/otok-config`, container composition) and an **extension registry** for optional `@kamod-ch/otok-*` packages. That is not deferred work — new capabilities should extend those mechanisms rather than inventing a parallel plugin system.

## Where to read next

- [2.x migration notes](./migration.md) — practical upgrades from 0.x-era names and docs
- [Release candidate (historical)](../1.0/release-candidate.md) — 2026 stabilization bundle narrative
- [Stabilization evidence log](../stabilization/status.md) — prompt-by-prompt history
