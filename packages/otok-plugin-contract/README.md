# @kamod-ch/otok-plugin-contract

Shared contract tests for Otok plugins, mirroring `otok-adapter-contract` for adapters.

## Usage

```ts
import { describe } from "vitest";
import { assertPluginContract } from "@kamod-ch/otok-plugin-contract";
import myPlugin from "@scope/my-plugin";

describe("my-plugin contract", () => {
  assertPluginContract({
    plugin: myPlugin,
    expected: {
      name: "my-plugin",
      hooks: ["config", "configureApp"],
    },
  });
});
```

## Validates

- Plugin `name` (and optional `version`)
- Required lifecycle hooks
- Virtual module registration
- Env schema resolution
- `PluginContainer.resolve()` succeeds
