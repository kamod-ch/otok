import type { ColorScheme, ThemePresetId } from "@kamod-ch/themes";
import { getThemeInitScript } from "@kamod-ch/themes";

export { ThemeProvider, useTheme } from "@kamod-ch/themes";
export { ThemeToggle } from "@kamod-ch/ui";
export { getThemeInitScript };
export type { ColorScheme, ThemePresetId };

export interface KamodThemeHeadProps {
  defaultPreset?: ThemePresetId;
  defaultScheme?: ColorScheme;
  nonce?: string;
}

/**
 * SSR-safe Kamod theme bootstrap for Otok route `head` exports or layouts.
 * Use when `@kamod-ch/themes` brand presets are enabled (`theme` !== `"default"`).
 */
export function KamodThemeHead({
  defaultPreset = "kamod",
  defaultScheme = "system",
  nonce,
}: KamodThemeHeadProps) {
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: getThemeInitScript({ defaultPreset, defaultScheme }),
      }}
    />
  );
}
