# @kamod-ch/otok-route-typegen

Filesystem route parsing, conflict detection, and TypeScript declaration generation for Otok apps.

## Usage

```bash
otok typegen --strict
otok routes
```

Programmatic API:

```ts
import { runRouteTypegen, scanRoutes, formatRouteTree } from "@kamod-ch/otok-route-typegen";

const scan = scanRoutes({ root: process.cwd(), routesDir: "src/app/routes" });
runRouteTypegen({ root: process.cwd(), routesDir: "src/app/routes", outputDir: ".otok/types" });
```

## Generated output

- `.otok/types/manifest.d.ts` — literal unions for `virtual:otok-routes`
- `.otok/types/**/<route>.d.ts` — per-route `Route` namespace augmentations
- `.otok/types/index.d.ts` — reference bundle for tsconfig include
- `.otok/types/.hash` — stable manifest fingerprint

Files are rewritten only when content changes.

## Integration

`@kamod-ch/otok-vite-plugin` calls `runRouteTypegen` during dev (debounced) and before production builds.
