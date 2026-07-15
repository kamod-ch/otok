---
title: Islands and Soft Navigation
section: Core Concepts
order: 14
---
# Islands and Soft Navigation

Islands are opt-in Preact components rendered on the server and hydrated in the browser.

```tsx
import { Island } from "otok/client";
import Counter from "../islands/counter";

export default function Page() {
  return <Island component={Counter} props={{ init: 5 }} strategy="visible" />;
}
```

Hydration strategies:

- `load`
- `idle`
- `visible`
- `media`
- `client-only`

Enable soft navigation in `src/client.ts`:

```ts
createOtokClient({ registry: islandModules, softNav: true });
```

Otok swaps `[data-otok-page]`, patches matching `[data-otok-swap]` regions, syncs managed head metadata, hydrates new islands, and updates browser history.
