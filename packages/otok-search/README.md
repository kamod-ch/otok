# @kamod-ch/otok-search

Full-text and faceted search helpers for Otok apps (in-memory and pluggable backends).

**Audience:** application developers.

## Install

```bash
pnpm add @kamod-ch/otok-search
```

Register via plugin when using `otok.config.ts`:

```bash
pnpm otok add search
```

Or import search utilities directly in route loaders and wire indexes in application code.

## Runtime

Requires Node or Edge adapters with appropriate storage for your chosen backend. See package exports and tests for supported providers.

## Links

- [Ecosystem — data and platform](https://kamod-ch.github.io/otok/guides/ecosystem-data-and-platform/)
- [Ecosystem catalog](https://kamod-ch.github.io/otok/guides/ecosystem/)
