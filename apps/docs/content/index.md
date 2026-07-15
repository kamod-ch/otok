---
title: What is Otok?
section: Introduction
order: 1
description: Lightweight Hono + Preact framework for server-rendered applications with islands and progressive enhancement.
---
# What is Otok?

Otok is a lightweight Hono + Preact framework for server-rendered applications with islands, progressive enhancement, and minimal client JavaScript.

It focuses on a small core:

- file-based server routes
- Preact server rendering
- opt-in islands
- progressive HTML forms
- route actions
- route middleware
- soft navigation
- Node production deployment

Otok does not require Kamod UI, Tailwind, a validation library, a database, or an auth framework. Those belong in applications, not in the framework core.

## Why Otok?

Use Otok when you want server-rendered pages, simple Hono composition, and client JavaScript only where interactivity is needed.

## Quick Start

```bash
pnpm create otok my-app
cd my-app
pnpm install
pnpm dev
```

## Project Structure

```text
src/server.ts          Hono server entry
src/client.ts          island hydration entry
src/app/routes/        pages, layouts, middleware, special routes
src/app/islands/       interactive Preact islands
```
