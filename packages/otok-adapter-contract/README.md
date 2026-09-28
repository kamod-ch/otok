# otok-adapter-contract

Shared contract tests and fixtures for Otok deployment adapters.

**Audience:** adapter authors and repository maintainers — not for production applications.

## Purpose

Validates that official adapters implement the shared adapter surface consistently. Used by adapter packages in this monorepo.

## Development

```bash
pnpm --filter otok-adapter-contract test
pnpm --filter otok-adapter-contract build
```

## Links

- [Deployment adapters guide](https://kamod-ch.github.io/otok/guides/adapters/)
- [Repository](https://github.com/kamod-ch/otok/tree/main/packages/otok-adapter-contract)
