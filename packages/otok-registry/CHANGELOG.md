# @kamod-ch/otok-registry

## 2.1.0

### Minor Changes

- Release all public Otok workspace packages as version 2.1.0.

### Patch Changes

- 3a98f5e: Align CLI upgrade and doctor with scoped core package names and registry snapshot targets instead of hardcoded 1.0.0 upgrade paths.

## 0.2.1

### Patch Changes

- 8380ef2: Add `@kamod-ch/otok-supabase` with SSR cookie auth, Hono middleware, plugin factory, loader helpers, and auth routes. Register the extension in the Otok registry and add the `with-supabase` example.

## 0.2.0

### Minor Changes

- 620dce6: Rename the unavailable `@otok/*` npm scope to `@kamod-ch/otok-*` so packages can publish under the kamod-ch organization (e.g. `@otok/vite-plugin` → `@kamod-ch/otok-vite-plugin`).
