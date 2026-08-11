# Support Matrix

Platform and deployment support for Otok **1.0**.

## Runtimes

| Platform | Support level | Tested in CI |
|----------|---------------|--------------|
| Node.js 20 LTS | Supported | Yes |
| Node.js 22 LTS | **Recommended** | Yes (primary) |
| Node.js 18 | Not supported | No |
| Cloudflare Workers | Supported | Yes (`smoke:cloudflare`) |
| Static / CDN | Supported | Yes (adapter tests) |
| Deno / Bun | Community / best-effort | No |

## Package managers

| Manager | Support |
|---------|---------|
| pnpm 10 | Primary (monorepo) |
| npm 10+ | Supported (CLI detects) |
| yarn 4 | Supported (CLI detects) |
| bun | Supported (CLI detects) |

## Browsers (client islands)

| Browser | Support |
|---------|---------|
| Chrome / Edge (last 2) | Supported |
| Firefox (last 2) | Supported (e2e) |
| Safari (last 2) | Supported (e2e) |
| IE11 | Not supported |

## Deployment targets

| Target | Adapter | CI coverage |
|--------|---------|-------------|
| Node server | `otok-adapter-node` | Examples + e2e |
| Cloudflare Workers | `otok-adapter-cloudflare` | Smoke test |
| Static export | `otok-adapter-static` | Adapter contract |

## TypeScript

| Version | Support |
|---------|---------|
| 5.6.x | Supported |
| 6.x | Supported (monorepo default) |

## Official plugins

See [@kamod-ch/otok-registry](https://github.com/kamod-ch/otok/tree/main/packages/otok-registry) for per-plugin adapter/runtime matrix.

Run locally:

```bash
otok info <extension>
```

## LTS

See [lts-strategy.md](../governance/lts-strategy.md).

## Getting support

| Channel | Use for |
|---------|---------|
| GitHub Issues | Bugs, features |
| GitHub Discussions | Questions |
| security@kamod.ch | Vulnerabilities |

No commercial SLA in open source. Enterprise support: contact maintainers.
