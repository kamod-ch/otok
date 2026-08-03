# @kamod-ch/otok-auth

## 2.0.0

### Minor Changes

- Implement Redis/Edge KV cache providers with adapter wiring, plugin render hooks and programmatic routes (ADR 0007), flash/validate/validation plugin wrappers, Microsoft/GitLab OAuth, Web Crypto password helpers, first-class `[[lang]]`/`[[locale]]` scanner metadata, deferred E2E coverage, and expanded examples CI.

### Patch Changes

- Updated dependencies [2e24c99]
- Updated dependencies [15b45d9]
- Updated dependencies
  - otok@0.4.0

## 1.0.0

### Minor Changes

- Add `createKyselySessionAdapter` and `SESSION_TABLE_MIGRATION_SQL` under `@kamod-ch/otok-auth/adapters/kysely`.
- Add `createMemorySessionAdapter` with optional persistence hooks under `@kamod-ch/otok-auth/adapters/memory`.
- Add tenant context, role gate, and compose helpers: `createTenantMiddleware`, `createSessionContextMiddleware`, `createRequireRoleMiddleware`, and `composeMiddleware`.
- Add `@kamod-ch/otok-auth` for cookie sessions, CSRF, and route/API auth middleware. Preserve Set-Cookie headers set during Otok middleware and actions when returning SSR or redirect responses.

### Patch Changes

- Updated dependencies [e853eb5]
- Updated dependencies [019e3fa]
- Updated dependencies
- Updated dependencies
- Updated dependencies [5bef6c4]
- Updated dependencies [f323daa]
- Updated dependencies [84363c3]
  - otok@0.3.0
