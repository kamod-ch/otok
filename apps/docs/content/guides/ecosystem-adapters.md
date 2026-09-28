---
title: Ecosystem — adapters
section: Guides
order: 11
---

# Deployment adapters

Adapters connect Otok to a hosting runtime. They are configured in `otok.config.ts`, not added as plugins.

| Package                   | Runtime                     |
| ------------------------- | --------------------------- |
| `otok-adapter-node`       | Node.js standalone server   |
| `otok-adapter-cloudflare` | Cloudflare Workers + Assets |
| `otok-adapter-static`     | Prerendered static hosting  |

**Contributor package:** `otok-adapter-contract` — shared adapter tests for package authors, not for applications.

## Detailed guide

Configuration, capabilities, and deployment notes live in [Deployment adapters](./adapters.md) and [Deployment guide](./deployment.md).

## Catalog

All adapter packages: [ecosystem catalog](./ecosystem.md) (Adapter section).
