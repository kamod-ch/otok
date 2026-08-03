# Deprecation Policy

## Scope

Applies to **Public** and **Experimental** APIs (see [api-classification.md](./api-classification.md)).

## Process

1. **Announce** — Mark deprecated in docs, JSDoc `@deprecated`, and changelog.
2. **Runtime warning** — Public APIs log a one-time `console.warn` in development when used.
3. **Registry** — Extension packages set `deprecated: true`, `deprecationMessage`, `successor`.
4. **CLI** — `otok doctor`, `otok add`, and `otok upgrade` surface warnings.
5. **Timeline** — Minimum **one minor release** deprecated before removal in next **major**.
6. **Migration guide** — Required for every removal or breaking replacement.

## Deprecation message format

```
[otok] <symbol> is deprecated since <version> and will be removed in <major>.
Use <replacement> instead. See <url>
```

## Extension packages

Publishers follow [@otok/registry publishers guide](../packages/otok-registry/docs/publishers.md):

- Keep deprecated entries in registry for migration tooling
- Set `maintenanceStatus: "deprecated"` or `"abandoned"`
- Provide `successor` package name when available

## Exceptions

- **Security** — Critical vulnerabilities may be patched without full deprecation cycle; CVE documented.
- **Internal** — May be removed without notice.

## Compatibility decision log

Breaking removals require an entry in `docs/1.0/compatibility-decisions.md` (maintainers only) with:

- Decision date
- Rationale
- Migration path
- Affected packages
