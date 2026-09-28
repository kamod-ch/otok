---
title: Ecosystem — AI and operations
section: Guides
order: 9
---

# AI and operations packages

LLM integration, observability, developer tooling, testing helpers, and the extension registry.

See [ecosystem catalog](./ecosystem.md) for install commands.

## Packages

| Package                        | When to use                          | Integration          | Deep dive                                                                     |
| ------------------------------ | ------------------------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `@kamod-ch/otok-ai`            | Streaming, tools, RAG, MCP routes    | plugin + composition | [Package README](https://github.com/kamod-ch/otok/tree/main/packages/otok-ai) |
| `@kamod-ch/otok-observability` | Metrics, health, tracing hooks       | plugin               | [SEO, security, observability](./seo-security-observability.md)               |
| `@kamod-ch/otok-devtools`      | Dev-only diagnostics                 | plugin               | [Devtools guide](./devtools.md)                                               |
| `@kamod-ch/otok-test`          | Server route tests without a browser | testing              | [Testing guide](./testing.md)                                                 |
| `@kamod-ch/otok-registry`      | Extension index for CLI              | cli + composition    | [CLI — otok add](./cli-add.md)                                                |
| `otok-cli`                     | `otok add`, doctor, upgrade          | cli                  | [CLI — otok add](./cli-add.md)                                                |

## AI safety

Configure provider API keys via environment variables. Use MCP allowlists and redaction options documented in `@kamod-ch/otok-ai` before exposing agent routes in production.

## Registry discovery

Official plugins are listed in the bundled registry. `pnpm otok add <alias>` installs the npm package and updates `otok.config.ts`. Compatibility ranges are checked against your Otok version.

## Examples

- [`examples/reference-ai-audit`](https://github.com/kamod-ch/otok/tree/main/examples/reference-ai-audit)
