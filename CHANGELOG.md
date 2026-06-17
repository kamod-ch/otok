# Changelog

## 0.1.0

### Breaking Changes

- Island IDs are now build-time stable and based on island filenames. Runtime fallback to `function.name` was removed to avoid production mismatches after minification.
- Route conventions now reserve `_layout.tsx`, `_not-found.tsx`, and `_error.tsx`.
- The default template uses layout routes and imports virtual module types from `@otok/vite-plugin/client`.

### Added

- Layout route convention with nested layout composition.
- Convention-based 404 and error routes.
- `redirect()`, `notFound()`, and `fail()` helpers.
- Catch-all, optional dynamic, and route group support in file routes.
- Hydration strategies for islands: `load`, `idle`, `visible`, and `media`.
- Hybrid island props transport for large JSON payloads.
- Extended `head()` output for links, scripts, and JSON-LD.
- `createOtokApp()` server helper.
- README, conventions documentation, CI workflow, and hardened `create-otok --template` handling.
