---
"@kamod-ch/otok-auth": patch
---

Add optional atomic `rotateRecord` on session adapters (Kysely and memory implementations) and route session rotation through it when available. Kysely gains `resolveRecord` with active-session filtering; manual rotation without metadata is a documented no-op instead of logging users out. Cookie max-age respects remaining absolute session expiry.
