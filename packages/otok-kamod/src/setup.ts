import { defineSetup, type PluginSetupContext } from "@kamod-ch/otok";
import { kamodStylesheetContent } from "./css.js";
import { DEFAULT_KAMOD_OPTIONS } from "./types.js";

export default defineSetup(async ({ dryRun }: PluginSetupContext) => {
  const content = kamodStylesheetContent(DEFAULT_KAMOD_OPTIONS.theme);

  if (!dryRun) {
    // Validated path prefix: src/config/
  }

  return {
    changes: [
      {
        kind: "create-file" as const,
        path: "src/config/kamod.css",
        content,
      },
    ],
  };
});
