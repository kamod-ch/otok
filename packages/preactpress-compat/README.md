# @kamod-ch/preactpress-compat

Compatibility layer for migrating [PreactPress](https://github.com/kamod-ch/preactpress) sites to [Otok](https://github.com/kamod-ch/otok) and `@kamod-ch/otok-content`.

## Usage

```ts
import { mapThemeConfig, buildPreactPressSearchIndex, adaptLayoutProps } from "@kamod-ch/preactpress-compat";
import legacy from "./.preactpress/config.ts";

const theme = mapThemeConfig(legacy.themeConfig);
```

See [PreactPress → Otok migration plan](../../docs/migration/preactpress-to-otok.md).
