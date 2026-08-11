# @kamod-ch/otok-registry

Versioned extension registry for the Otok ecosystem — schema validation, offline cache, search, compatibility checks, and CLI integration.

## Install

```bash
pnpm add @kamod-ch/otok-registry
```

## API

```ts
import {
  createRegistryClient,
  searchExtensions,
  resolveExtension,
  checkCompatibility,
  findOutdated,
} from "@kamod-ch/otok-registry";

const registry = await createRegistryClient({ offline: true }).then((c) => c.load());
const results = searchExtensions(registry, { q: "storage" });
const entry = resolveExtension(registry, "otok-kysely");
const compat = checkCompatibility(entry!, { otokVersion: "0.4.5", adapter: "node" });
```

## Documentation

- [User guide](./docs/users.md)
- [Publisher guide](./docs/publishers.md)

## Scripts

```bash
pnpm registry:checksum   # regenerate index.json checksum
pnpm test                # schema, checksum, search, offline tests
```
