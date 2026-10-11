# @kamod-ch/otok-ai

Framework-wide AI integration for [Otok](https://github.com/kamod-ch/otok) — not a thin OpenAI wrapper.

## Features

- **Typed streaming** — SSE `Response` from actions or async event iterators
- **Structured output** — Standard Schema validation (Zod, etc.)
- **Tool calls** — `defineAiTool()` with typed parameters and execution
- **Agent actions** — multi-step tool loops via `ai.agent()` (same budget, redaction, usage, and audit policy as `stream()` / `structured()` — budget `check` before every provider round, `record` after each round’s usage, no end-of-run double billing)
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
import { defineConfig } from "@kamod-ch/otok";

export default defineConfig({
  plugins: [
    ai({
      provider: process.env.OPENAI_API_KEY ? { type: "openai", defaultModel: "gpt-4o-mini" } : { type: "test" },
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

## Execution policy (`stream`, `structured`, `agent`)

All three paths share the same rules:

| Rule      | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Budget    | `check()` before every provider round; reservation stores also `acquireReservation` / `settleReservation` per round (see `docs/budgets.md`).                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Usage     | Reservation stores settle actual usage per round; legacy stores use `record()`. No end-of-run double billing on `agent()`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Postgres  | Optional `@kamod-ch/otok-ai/budget/kysely` + `migrateAiBudgetSchema` (peer `kysely`, no core DB dependency).                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Redaction | When `redact` is enabled (default), outgoing messages are redacted; tool results sent **back to the provider** are redacted as text. Tool `execute()` still receives validated real inputs. System text, roles, IDs, and the original user message array reference stay structurally intact.                                                                                                                                                                                                                                                                            |
| Hooks     | `onUsage` and `onAudit` fire per operation (`ai.stream`, `ai.structured`, `ai.agent`) with model/user/org metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Retries   | `agent()` does not retry after tools or partial stream progress; `stream()` / `structured()` keep safe pre-progress retries only.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Timeouts  | `timeoutMs` starts when the operation begins and covers the full async iteration (provider stream chunks, tool rounds, and tee/SSE consumption). User `abort()` / aborted `signal` → `OtokAiAbortedError`; client timer → `OtokAiTimeoutError`. Timers and merged-signal listeners are cleared when the operation finishes or fails. Cooperative providers should honor `signal`; uncooperative providers are cut off via abort races on `next()` (best-effort `return()` on the provider iterator). External side effects already started by a tool cannot be revoked. |

## Security

See [docs/SECURITY.md](./docs/SECURITY.md).

## Exports

| Path                               | Purpose                            |
| ---------------------------------- | ---------------------------------- |
| `@kamod-ch/otok-ai`                | Core client, types, utilities      |
| `@kamod-ch/otok-ai/loader`         | `defineAiAction`, `defineAiLoader` |
| `@kamod-ch/otok-ai/plugin`         | `ai()` plugin factory              |
| `@kamod-ch/otok-ai/providers/test` | Deterministic test provider        |
| `@kamod-ch/otok-ai/mcp`            | MCP server helpers                 |
| `@kamod-ch/otok-ai/rag`            | RAG adapter interfaces             |
| `@kamod-ch/otok-ai/cli`            | `otok ai-context` implementation   |
