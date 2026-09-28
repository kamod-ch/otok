# Discussion UI (`@kamod-ch/otok-discussions/ui`)

SSR-first Preact components using verified `@kamod-ch/ui` and `@kamod-ch/icons` exports. Import Kamod theme **once** in the host app (for example via `@kamod-ch/otok-kamod/theme`); this package does not ship theme CSS.

## Install peers

```bash
pnpm add @kamod-ch/otok-discussions @kamod-ch/ui @kamod-ch/icons preact
```

## Usage

```tsx
import { Discussion, discussionViewModelFromPageData } from "@kamod-ch/otok-discussions/ui";

export function ArticleDiscussion(props: { data: PluginDiscussionPageData }) {
  return <Discussion model={discussionViewModelFromPageData(props.data)} />;
}
```

Optional composer island (character count + versioned local draft in `localStorage`):

```tsx
import { DiscussionComposerIsland } from "@kamod-ch/otok-discussions/ui/islands";
import { Island } from "@kamod-ch/otok/client";
```

Thread interactions (no JavaScript required):

- Sort via `?sort=newest|oldest|top` on `{basePath}/:subjectId/thread`
- Cursor pagination via `?cursor=…` (scoped to sort + thread)
- Inline report via `?report=:commentId`, edit via `?edit=:commentId`, focus via `?focus=:commentId`
- Reply depth capped by runtime `maxDepth`; extra replies open `{basePath}/:subjectId/replies/:parentId`

## Visual fixtures

Enable the bundled fixture page when creating the extension:

```ts
createDiscussions({
  /* … */
  ui: { fixturesRoute: true },
});
```

Then open `{basePath}/_ui-fixtures` with your global Kamod theme loaded.

## Kamod mapping

See `DISCUSSION_UI_KAMOD_MAP` in the `./ui` entry and `src/ui/kamod-map.ts`.
