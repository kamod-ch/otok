# CLAUDE.md – Repository Rules for Automated Maintenance

## Project Stack
- Package Manager: `pnpm` (never use `npm` or `yarn`)
- Language: TypeScript (strict mode)
- Versioning: `@changesets/cli`

## Mandatory Verification Before Finishing
Every automated run MUST execute and pass all available scripts in `package.json`:
1. `pnpm typecheck` (or `pnpm check`)
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`

## Changeset Rules
- **Create a `.changeset/<descriptive-name>.md` file** ONLY when:
  - files inside `src/` were modified, or
  - runtime `dependencies` / `peerDependencies` in `package.json` were updated.
- **Do NOT create a changeset** when only `devDependencies`, lockfiles, CI configs, or Markdown documentation changed.
- Format:
  ```md
  ---
  "@kamod-ch/<package-name>": patch
  ---

  Update dependencies and adjust types for compatibility.