# @kamod-ch/otok-plugin-hello

Minimal Otok plugin that registers `GET /api/plugin/hello`.

```ts
import { defineConfig } from "@kamod-ch/otok";
import hello from "@kamod-ch/otok-plugin-hello";

export default defineConfig({
  plugins: [hello()],
});
```

See [`apps/docs/content/guides/create-your-first-plugin.md`](../../apps/docs/content/guides/create-your-first-plugin.md).
