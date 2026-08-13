import { definePlugin } from "@kamod-ch/otok";
import { kamodStylesheetContent } from "./css.js";
import { DEFAULT_KAMOD_OPTIONS, type KamodPluginOptions, type KamodThemePreset } from "./types.js";
import { checkKamodVersions, formatVersionIssues, readInstalledVersion } from "./versions.js";
import { createKamodTailwindPlugin } from "./vite/tailwind.js";

const BRAND_PRESETS = new Set<KamodThemePreset>([
  "kamod",
  "shadcn",
  "ocean",
  "sunset",
  "cursor-warm",
  "voltage",
  "watson",
  "professional",
]);

function normalizeOptions(input: KamodPluginOptions | undefined): Required<KamodPluginOptions> {
  const theme = input?.theme ?? DEFAULT_KAMOD_OPTIONS.theme;
  if (theme !== "default" && !BRAND_PRESETS.has(theme)) {
    throw new Error(
      `kamod() theme "${theme}" is invalid. Use "default" or one of: ${[...BRAND_PRESETS].join(", ")}`,
    );
  }

  return {
    theme,
    icons: input?.icons ?? DEFAULT_KAMOD_OPTIONS.icons,
    forms: input?.forms ?? DEFAULT_KAMOD_OPTIONS.forms,
    css: input?.css ?? DEFAULT_KAMOD_OPTIONS.css,
    darkMode: input?.darkMode ?? DEFAULT_KAMOD_OPTIONS.darkMode,
  };
}

const kamodPluginFactory = definePlugin<KamodPluginOptions>({
  name: "@kamod-ch/otok-kamod",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (input != null && typeof input !== "object") {
        throw new Error("kamod() options must be an object");
      }
      return normalizeOptions(input as KamodPluginOptions | undefined);
    },
  },
});

let registeredOptions: Required<KamodPluginOptions> | null = null;

export function getKamodPluginOptions(): Required<KamodPluginOptions> | null {
  return registeredOptions;
}

/**
 * Optional Kamod ecosystem integration for Otok apps.
 *
 * ```ts
 * import kamod from "@kamod-ch/otok-kamod";
 *
 * export default defineConfig({
 *   plugins: [kamod({ theme: "default", icons: true, forms: true })],
 * });
 * ```
 */
export default function kamod(options?: KamodPluginOptions) {
  const normalized = normalizeOptions(options);
  registeredOptions = normalized;

  const plugin = kamodPluginFactory(normalized);

  plugin.config = () => {
    const stylesheet = normalized.css.startsWith("/") ? normalized.css : `/${normalized.css}`;
    return {
      theme: normalized.darkMode,
      devStylesheets: [stylesheet],
    };
  };

  plugin.buildStart = async ({ root }) => {
    const issues = await checkKamodVersions(root);
    if (issues.length > 0) {
      throw new Error(`@kamod-ch/otok-kamod version check failed:\n${formatVersionIssues(issues)}`);
    }

    if (normalized.theme !== "default") {
      const themesVersion = await readInstalledVersion(root, "@kamod-ch/themes");
      if (!themesVersion) {
        throw new Error(
          'otok-kamod: theme preset requires @kamod-ch/themes. Install it:\n  pnpm add @kamod-ch/themes',
        );
      }
    }
  };

  plugin.configureVite = async () => createKamodTailwindPlugin();

  plugin.virtualModules = {
    options: () => `export const kamodOptions = ${JSON.stringify(normalized)};`,
    stylesheet: () =>
      `export const kamodStylesheet = ${JSON.stringify(kamodStylesheetContent(normalized.theme))};`,
  };

  return plugin;
}

export { kamodStylesheetContent, normalizeOptions };
