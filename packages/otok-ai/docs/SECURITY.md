# @kamod-ch/otok-ai — Security

This document describes the security model for Otok AI integration.

## Threat Model

| Asset | Risk | Mitigation |
|-------|------|------------|
| API keys (OpenAI, etc.) | Exfiltration via prompts/logs | Server-only env vars; redaction; never in client bundles |
| User prompts | PII leakage in logs/audit | Default redaction; opt-out only in dev |
| Tool execution | Privilege escalation | Typed tools; explicit registration; no arbitrary code exec |
| MCP route proxy | Unauthorized data access | Explicit route allowlist only |
| AI spend | Cost abuse | Per-user/org budgets; AI rate limits |
| Streaming | DoS via long connections | Timeouts; abort signals; body limits (otok-security) |

## API Key Handling

- Keys are read from `OPENAI_API_KEY` or plugin `provider.apiKey` on the **server only**.
- The `envSchema` validates keys at config load but never exposes them to the client.
- `otok ai-context` and `generateAiContext()` strip env values and secret patterns.

## Redaction

Default `redact: true` in the AI plugin:

- OpenAI-style keys (`sk-…`)
- GitHub tokens (`ghp_…`)
- JWTs, Bearer tokens
- `password=`, `secret=`, `api_key=` patterns

Use `redactText()` before logging or audit export.

## Budgets

`AiBudgetStore.check()` runs **before** each generation:

- `maxTokens` per user/org/request
- `maxCostUsd` per billing period

Implement custom stores backed by PostgreSQL for production.

## Rate Limits

Separate from `@kamod-ch/otok-security` global limits:

```ts
ai({
  rateLimit: { windowMs: 60_000, max: 20 },
})
```

Applied to `/api/ai/*` routes.

## MCP (Model Context Protocol)

- Only routes in `mcpRoutes: readonly string[]` are exposed.
- No automatic route discovery — **explicit opt-in required**.
- MCP proxy uses internal `fetchImpl`; does not bypass auth middleware on target routes.

## Tool Calls

- Tools must be registered via `defineAiTool()` with Standard Schema parameters.
- Arguments are validated before `execute()`.
- Tools receive `AiToolContext` (userId, orgId, signal) — enforce authorization inside `execute`.

## Cancellation & Timeouts

- `signal` from action context propagates to provider fetch.
- `stream().abort()` revokes in-flight generation.
- Default timeout: 60s (configurable via `timeoutMs`).

## Audit

`AiClient` emits audit entries on stream/structured calls (hook via `onAudit`).

Integrate with `@kamod-ch/otok-audit` in application code:

```ts
onAudit: (entry) => audit.record({ action: entry.action, ... })
```

## Recommendations for Production

1. Use `provider: { type: "openai" }` with keys from secret manager.
2. Set `redact: true` (default).
3. Implement persistent `budgetStore` and monitor `estimatedCostUsd`.
4. Combine with `security({ rateLimit, csrf: true })`.
5. Never pass user-controlled model names without allowlist.
6. Review `mcpRoutes` in code review — treat as public API surface.

## Reporting

Report security issues to the Otok maintainers via GitHub Security Advisories.
