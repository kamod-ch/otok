/** Kamod theme presets from `@kamod-ch/themes`. Use `"default"` for `@kamod-ch/ui/theme.css` only. */
export type KamodThemePreset =
  | "default"
  | "kamod"
  | "shadcn"
  | "ocean"
  | "sunset"
  | "cursor-warm"
  | "voltage"
  | "watson"
  | "professional";

export interface KamodPluginOptions {
  /**
   * Theme preset. `"default"` imports `@kamod-ch/ui/theme.css`.
   * Any other value imports `@kamod-ch/themes` with the matching brand preset.
   */
  theme?: KamodThemePreset;
  /** Document icon subpath imports; icons stay tree-shaken when imported from `@kamod-ch/icons/*`. */
  icons?: boolean;
  /** Enable `@kamod-ch/otok-kamod/forms` helpers for Otok validation field errors. */
  forms?: boolean;
  /** Project-relative CSS entry. Defaults to `src/style.css`. */
  css?: string;
  /** Enable Otok theme bootstrap (dark mode). Defaults to true. */
  darkMode?: boolean;
}

export const DEFAULT_KAMOD_OPTIONS: Required<
  Pick<KamodPluginOptions, "theme" | "icons" | "forms" | "css" | "darkMode">
> = {
  theme: "default",
  icons: true,
  forms: true,
  css: "src/style.css",
  darkMode: true,
};
