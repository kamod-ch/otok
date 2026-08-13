# otok-cli

## 0.2.0

### Minor Changes

- 620dce6: Rename the unavailable `@otok/*` npm scope to `@kamod-ch/otok-*` so packages can publish under the kamod-ch organization (e.g. `@otok/vite-plugin` → `@kamod-ch/otok-vite-plugin`).

### Patch Changes

- Updated dependencies [620dce6]
  - @kamod-ch/otok-config@0.3.0
  - @kamod-ch/otok-registry@0.2.0
  - @kamod-ch/otok-route-typegen@0.2.0
  - @kamod-ch/otok-ai@0.1.0
  - @kamod-ch/otok-kysely@2.0.0

## 0.1.1

### Patch Changes

- Implement Redis/Edge KV cache providers with adapter wiring, plugin render hooks and programmatic routes (ADR 0007), flash/validate/validation plugin wrappers, Microsoft/GitLab OAuth, Web Crypto password helpers, first-class `[[lang]]`/`[[locale]]` scanner metadata, deferred E2E coverage, and expanded examples CI.
- Updated dependencies
  - @kamod-ch/otok-config@0.2.0
  - @kamod-ch/otok-kysely@2.0.0
