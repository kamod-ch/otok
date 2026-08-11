# Contributor Guide — Otok 1.0

Extended guide for contributors. See also [CONTRIBUTING.md](../../CONTRIBUTING.md) for setup.

## Getting started

```bash
git clone https://github.com/kamod-ch/otok.git
cd otok
pnpm install
pnpm check
```

## What to work on

Check [gap-analysis.md](./gap-analysis.md) and GitHub issues labeled `good first issue`.

## Contribution types

| Type | Changeset? | Tests? |
|------|--------------|--------|
| Bug fix | Patch | Required |
| New Public API | Minor + RFC | Required + api-stability.json |
| Experimental feature | Minor | Required |
| Docs only | No | N/A |
| Internal refactor | No | Existing tests pass |

## API changes

1. Read [api-classification.md](../governance/api-classification.md)
2. Public changes need RFC for significant design (see [rfc-process.md](../governance/rfc-process.md))
3. Update `api-stability.json`
4. Add migration notes if breaking (Experimental only without major)

## Plugin development

- Use `definePlugin` from `otok`
- Run plugin against `@kamod-ch/otok-plugin-contract` tests
- Add registry entry via separate PR

## Adapter development

- Extend `otok-adapter-contract` expectations
- Document capabilities in adapter README

## CLI changes

- Add `--help` to new commands
- Snapshot tests in `packages/otok-cli/test/`
- Update CLI README

## Benchmarks

Do not regress budgets without discussion:

```bash
pnpm bench:otok
pnpm budget:check
```

## PR checklist

- [ ] `pnpm check` passes
- [ ] Changeset if needed (`pnpm changeset`)
- [ ] Docs updated for user-visible changes
- [ ] No secrets in commits

## Code style

- Match surrounding code
- Minimal scope — no drive-by refactors
- ADRs for architectural decisions (`docs/adr/`)

## Community

- Be respectful in reviews
- Prefer async GitHub comments over DMs for technical decisions
