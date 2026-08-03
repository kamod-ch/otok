---
title: Getting started
description: First steps with the Otok migration example.
order: 1
---

## Install

```bash
pnpm install
pnpm dev
```

## Build static output

```bash
pnpm build
```

The static adapter prerenders all documentation routes at build time.

## Migration path

1. Keep your PreactPress content directory.
2. Add `@kamod-ch/otok-content` and `@kamod-ch/preactpress-compat`.
3. Map `themeConfig` with `mapThemeConfig()`.
4. Replace `Layout.tsx` with Otok `DocsLayout` (see `src/app/components/docs-layout.tsx`).

> [!TIP]
> Use the compatibility layer for incremental migration — no big-bang rewrite required.
