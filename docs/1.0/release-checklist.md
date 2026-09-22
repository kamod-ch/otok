# Release checklist (executable scripts)

Use before tagging an RC or stable release. **No step here publishes to npm** — see [release-runbook.md](./release-runbook.md) for publish.

**Orchestrated gate (single command):**

```bash
pnpm release:check
```

Implemented in [`scripts/release-check.mjs`](../../scripts/release-check.mjs). Fails fast on first error.

---

## Step map (`pnpm release:check`)

| Step | Script | What it proves |
|------|--------|----------------|
| 1 | `pnpm check:scaffold` | Playground → template sync |
| 2 | `pnpm lint` | Oxlint + repo policy |
| 3 | `pnpm format:check` | Oxfmt |
| 4 | `pnpm api:check` | `api-stability.json` ↔ package exports |
| 5 | `pnpm typecheck` | Packages + apps types |
| 6 | `pnpm test` | Workspace unit tests |
| 7 | `pnpm build` | Packages + playground + docs |
| 8 | `pnpm api:snapshot:check` | Declaration snapshot vs baseline |
| 9 | `pnpm pack:check` | Dry-run npm pack all packages |
| 10 | `pnpm check:pack-consumer` | Tarball install SSR + browser + types |
| 11 | `pnpm reproducible:check` | Dual clean build `@kamod-ch/otok-config` |
| 12 | `pnpm budget:measure` | Playground bundle gzip entries |
| 13 | `pnpm bench:otok` | Playground prod build + benchmark JSON |
| 14 | `pnpm budget:check` | Budgets vs `benchmarks/budgets.json` |
| 15 | `pnpm check:examples` | Pack + typecheck + build selected examples |

---

## CI parity (partial)

GitHub Actions splits the above across jobs — see `.github/workflows/ci.yml`:

- **Static:** lint, format, scaffold, metadata, `api:check`, `pnpm test:gates`, typecheck
- **Test:** package build + vitest (Node 20/22)
- **Build:** full build, snapshot, bench+budget, pack consumer, reproducible, `check:examples`

Run `pnpm test:gates` locally if you changed gate scripts (included in CI static job, not in `release:check`).

---

## Reference app (devjobs)

Not part of `check:examples` — run explicitly:

```bash
pnpm --filter devjobs-reference docker:up   # or external Postgres
pnpm --filter devjobs-reference db:migrate
pnpm --filter devjobs-reference db:seed
pnpm --filter devjobs-reference build
pnpm --filter devjobs-reference test
pnpm --filter devjobs-reference worker     # separate terminal — CSV import smoke
```

Integration HTTP tests: `DEVJOBS_INTEGRATION=1 DEVJOBS_TEST_URL=http://127.0.0.1:5180 pnpm --filter devjobs-reference test:integration`

---

## Playwright (playground)

Not in `release:check` (runtime cost):

```bash
pnpm --filter @kamod-ch/otok build
CI=1 pnpm --filter playground exec playwright test --project=chromium
```

Or workspace: `pnpm test:e2e`.

---

## Smoke deploys

| Command | Target |
|---------|--------|
| `pnpm smoke:node` | Node deployment example |
| `pnpm smoke:cloudflare` | Workers dry-run |

---

## Pre-tag manual items

- [ ] Changesets reviewed (`.changeset/*.md`); `pnpm changeset version` on release branch only
- [ ] [gap-analysis.md](./gap-analysis.md) — no unwaived P0 for intended tag level
- [ ] [known-limitations.md](./known-limitations.md) acknowledged in release notes
- [ ] [migration-stabilization.md](./migration-stabilization.md) linked for app teams
- [ ] Registry checksum updated if `extensions.json` changed
- [ ] Maintainer sign-off table below

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Maintainer | | |
| `release:check` log attached | | |
