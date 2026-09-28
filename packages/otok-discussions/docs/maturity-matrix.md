# Maturity matrix (0.1.0 pre-release)

Legend: **GA** = covered by automated tests/examples and documented for production intent; **Beta** = tested but limited ops story; **Alpha** = partial/tests only; **Planned** = not shipped.

| Area                         | Level | Evidence                                                         |
| ---------------------------- | ----- | ---------------------------------------------------------------- |
| **Core domain**              | GA    | `domain/*.test.ts`, `engine/*.test.ts`, `config.test.ts`         |
| **Memory adapter**           | GA    | `adapters/memory/engine.test.ts`, pack consumer core profile     |
| **PostgreSQL (Kysely)**      | Beta  | `kysely.integration.test.ts` with `OTOK_DISCUSSIONS_PG_TEST_URL` |
| **SQLite (Kysely)**          | GA    | Same integration suite (default in CI)                           |
| **Application services**     | GA    | `services.test.ts`, `moderation-lifecycle.test.ts`               |
| **HTTP plugin / SSR routes** | Beta  | `e2e.test.ts` (Otok test app), `examples/discussions-reference`  |
| **JSON API**                 | Alpha | Opt-in `jsonApi.enabled`; fewer dedicated tests                  |
| **UI (SSR)**                 | Beta  | `ui.test.tsx`, `a11y.test.tsx`, Kamod map; peers verified        |
| **UI islands**               | Alpha | Composer live region; optional hydration                         |
| **Moderation queue UI**      | Beta  | Route loaders + `moderation-lifecycle.test.ts`                   |
| **Rate limiting**            | Beta  | `createCapabilityRateLimiter`, `security-hardening.test.ts`      |
| **Public page cache**        | Alpha | Opt-in; regression tests after `noStore` default                 |
| **Events**                   | Alpha | `EventSink` hook + payload helpers; no outbox                    |
| **i18n / a11y**              | Beta  | `i18n/*.test.ts`, `docs/i18n-a11y.md`                            |
| **Pack / ESM consumers**     | GA    | `test:pack-consumer`, `verify-ui-artifacts.mjs`                  |

Production claims in README must stay within **GA/Beta** rows unless explicitly marked experimental.
