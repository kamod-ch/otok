# @kamod-ch/otok-route-typegen

## 0.2.1

### Patch Changes

- 8380ef2: Publish the Otok core runtime as `@kamod-ch/otok` because npm blocks the unscoped `otok` package name. Update generated route types, Vite plugin declarations, and scaffold templates to import the scoped core package.

## 0.2.0

### Minor Changes

- 620dce6: Rename the unavailable `@otok/*` npm scope to `@kamod-ch/otok-*` so packages can publish under the kamod-ch organization (e.g. `@otok/vite-plugin` → `@kamod-ch/otok-vite-plugin`).
