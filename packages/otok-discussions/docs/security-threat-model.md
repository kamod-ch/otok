# Threat model — `@kamod-ch/otok-discussions`

Scope: public SSR routes, form/JSON mutations, moderation API, HTML cache (Otok 0.6.2+), domain events, optional `@kamod-ch/otok-queue` outbox.

## Assets & trust boundaries

| Asset | Boundary |
|-------|----------|
| Comment/report text | Stored in app DB; must not become XSS or log leaks |
| Tenant/subject scope | Resolved from **verified** auth scope, not client headers |
| Moderation queue/detail | Moderator tenant allow-list + explicit superadmin role |
| Public HTML cache | Anonymous, **published-only** thread snapshots |
| Domain events | Minimal payloads; no full comment bodies |

## Threats, controls, tests

| Threat | Control | Test(s) |
|--------|---------|---------|
| **Spam / resource exhaustion** | Capability rate limits (actor id); body length + Unicode limits; pagination caps | `security-hardening.test.ts` rate races; large payload |
| **XSS (stored/reflected)** | Restricted markdown/plaintext; no raw HTML storage; safe link allowlist; escaped render | XSS payload suite |
| **CSRF** | Otok-auth CSRF on cookie-session mutations (`assertMutationAuth`) | Existing e2e idempotency/forms |
| **IDOR** | Subject/comment loads scoped to tenant; policy checks on every mutation | moderation-lifecycle tenant isolation |
| **Tenant leak (cache)** | Personalized requests skip shared HTML cache; moderation `noStore`; cache keys use verified scope | Cache policy unit tests |
| **Tenant leak (API)** | `resolveSubject` + store queries filtered by tenant | services + lifecycle tests |
| **Moderator abuse** | Policy + reason codes + immutable audit; rate limit on moderation apply | Audit completeness tests |
| **Reaction manipulation** | Auth required; one reaction per user per comment; rate limit | interaction + rate tests |
| **Report spam** | Dedupe + rate limit; no report body in events/logs | report duplicate + redaction |
| **Cache leak (user state)** | No `viewerReaction` in shared cache path (session → personalized); documented host `setOtokCacheScope` | `publicCacheEligible` helper tests |
| **Provider dependency** | Spam provider fail-open/closed per mode; event handler timeout does not roll back mutation | event timeout test |

## Residual risk / provider deps

- **HTML cache tag granularity**: Otok route `defineRendering()` tags are static; thread-level tags require host `cacheInvalidation` wiring or `revalidatePath` fallback (see `docs/security-production.md`).
- **Edge rate limiting**: In-process limiter is not distributed; production should use Redis/edge limiter implementing `RateLimitProvider`.
- **CSRF/session**: Provided by host `DiscussionsAuthAdapter` + `@kamod-ch/otok-auth` — not optional for cookie apps.
- **Queue/outbox**: Slow handlers should use `@kamod-ch/otok-queue` with verified job payloads; plugin emits minimal sync events only.
