# @kamod-ch/otok-security

## 2.1.0

### Minor Changes

- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Normalize redirect targets before allowlist and origin checks: reject control characters and backslashes, canonicalize path segments via URL parsing, and return safe canonical Location values to block open-redirect normalization gaps.
- 3a98f5e: Register host validation middleware when `trustedOrigins` is set even if `trustedHosts` is empty, so origin checks apply in origin-only security configurations.
- Updated dependencies [3a98f5e]
- Updated dependencies [3a98f5e]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies [00aac39]
- Updated dependencies
- Updated dependencies [00aac39]
  - @kamod-ch/otok@2.1.0

## 2.0.0

### Patch Changes

- Updated dependencies [2e24c99]
- Updated dependencies [15b45d9]
- Updated dependencies
  - otok@0.4.0
