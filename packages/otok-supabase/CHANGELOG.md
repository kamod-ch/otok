# @kamod-ch/otok-supabase

## 2.1.0

### Minor Changes

- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Normalize redirect targets before allowlist and origin checks: reject control characters and backslashes, canonicalize path segments via URL parsing, and return safe canonical Location values to block open-redirect normalization gaps.
- 3a98f5e: Pass Supabase auth passwords through without trimming while keeping trimmed validation for email and other text fields.
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

## 1.1.0

### Minor Changes

- 8380ef2: Add `@kamod-ch/otok-supabase` with SSR cookie auth, Hono middleware, plugin factory, loader helpers, and auth routes. Register the extension in the Otok registry and add the `with-supabase` example.

### Patch Changes

- Updated dependencies [8380ef2]
  - @kamod-ch/otok@0.6.1

## 1.0.0

Initial release: SSR cookie auth, PKCE, Hono/Otok middleware, typed clients, auth routes, admin entry point, Otok plugin factory, loader helpers, storage/realtime entry points, and registry integration.
