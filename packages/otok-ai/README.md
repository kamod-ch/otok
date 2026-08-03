# @kamod-ch/otok-ai

Framework-wide AI integration for [Otok](https://github.com/kamod-ch/otok) — not a thin OpenAI wrapper.

## Features

- **Typed streaming** — SSE `Response` from actions or async event iterators
- **Structured output** — Standard Schema validation (Zod, etc.)
- **Tool calls** — `defineAiTool()` with typed parameters and execution
- **Agent actions** — multi-step tool loops via `ai.agent()`
- **Provider interface** — swappable providers (test, OpenAI, custom)
- **RAG** — `RagAdapter`, `EmbeddingProvider`, `VectorStore` interfaces
- **Budgets** — token/cost limits per user and organization
- **Rate limits** — AI-specific request throttling
- **Redaction** — prompt/output secret stripping
- **MCP** — expose explicitly allowlisted Otok routes
- **Workflows** — bridge to `@kamod-ch/otok-workflows`
- **`llms.txt`** — machine-readable framework docs at `/llms.txt`
- **`otok ai-context`** — generate Cursor/AGENTS.md context files

## Install

```bash
pnpm add @kamod-ch/otok-ai
```

## Plugin setup

```ts
import ai from "@kamod-ch/otok-ai";
import { defineConfig } from "otok";

export default defineConfig({
  plugins: [
    ai({
      provider: process.env.OPENAI_API_KEY
        ? { type: "openai", defaultModel: "gpt-4o-mini" }
        : { type: "test" },
      rateLimit: { windowMs: 60_000, max: 30 },
      mcpRoutes: ["/api/companies", "/api/tasks"],
    }),
  ],
});
```

## Agent action example

```ts
import { defineAiAction } from "@kamod-ch/otok-ai/loader";
import { defineAiTool } from "@kamod-ch/otok-ai/tools";
import { z } from "zod";

const findCompany = defineAiTool({
  name: "findCompany",
  description: "Find company by name",
  parameters: z.object({ name: z.string() }),
  execute: async (input) => db.findCompany(input.name),
});

export const action = defineAiAction(async ({ ai, formData }) => {
  const messages = JSON.parse(String(formData?.get("messages") ?? "[]"));
  return ai.stream({
    model: "configured-default",
    messages,
    tools: { findCompany },
    budget: { userId: "user-id-from-auth" },
  }).response;
});
```

## CLI

```bash
otok ai-context --format cursor-rules
otok ai-context --format agents-md
otok ai-context --format json -o tmp/context.json
```

## Security

See [docs/SECURITY.md](./docs/SECURITY.md).

## Exports

| Path | Purpose |
|------|---------|
| `@kamod-ch/otok-ai` | Core client, types, utilities |
| `@kamod-ch/otok-ai/loader` | `defineAiAction`, `defineAiLoader` |
| `@kamod-ch/otok-ai/plugin` | `ai()` plugin factory |
| `@kamod-ch/otok-ai/providers/test` | Deterministic test provider |
| `@kamod-ch/otok-ai/mcp` | MCP server helpers |
| `@kamod-ch/otok-ai/rag` | RAG adapter interfaces |
| `@kamod-ch/otok-ai/cli` | `otok ai-context` implementation |
