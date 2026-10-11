# workflow-operations (Plan 034)

Private reference app for operators: list workflow instances, inspect steps, and apply **pause**, **resume** (paused only), **approve** (waiting_approval only), or **cancel** via HTML forms (no JS required).

Design contract: [`../../plans/workflow-operations-design.md`](../../plans/workflow-operations-design.md) and [`../../plans/workflow-operations-contract.json`](../../plans/workflow-operations-contract.json).

## Security model

- One deployment ↔ one `WorkflowStore` (no header-based tenancy).
- **No default credentials in code.** Set env vars before start:
  - `WORKFLOW_OPS_SESSION_SECRET` (≥16 chars)
  - `WORKFLOW_OPS_OPERATOR_PASSWORD`
- Mutations require `workflow:operate`, CSRF token, and state-matrix checks (409 on invalid transitions).
- `resume()` on the engine is **not** shown as a generic “continue” — UI uses **Approve and continue** only in `waiting_approval`.

## Local run

```bash
cd examples/workflow-operations
export WORKFLOW_OPS_SESSION_SECRET='local-dev-secret-32-chars-min'
export WORKFLOW_OPS_OPERATOR_PASSWORD='choose-a-strong-password'
pnpm exec tsx src/server.ts
```

Open `http://127.0.0.1:5190/login`. Default dev server uses in-memory store; production-style deployments should wire `createKyselyWorkflowStore` (same DB boundary as workers).

## Tests

```bash
pnpm --filter workflow-operations test
pnpm --filter workflow-operations test:e2e
pnpm --filter workflow-operations build
```

From repo root: `pnpm check:workflow-operations`.

## Lease note (Plan 032)

Workers use leased `processRunnable`. Operator `resume`/`approve` calls unclaimed `execute`; if another worker holds an active lease, the engine may reject execution — the UI maps that to **409**.
