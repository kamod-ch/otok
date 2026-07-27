import type { KamodThemePreset } from "./types.js";

/** CSS `@import` lines for the selected Kamod theme preset. */
export function kamodCssImports(theme: KamodThemePreset = "default"): string {
  const lines = ['@import "tailwindcss";'];

  if (theme === "default") {
    lines.push('@import "@kamod-ch/ui/theme.css";');
    return `${lines.join("\n")}\n`;
  }

  lines.push('@import "@kamod-ch/themes/theme.css";');
  lines.push(`@import "@kamod-ch/themes/brands/${theme}.css";`);
  return `${lines.join("\n")}\n`;
}

/** Minimal app styles layered on Kamod tokens. */
export function kamodBaseStyles(): string {
  return `:root {
  color-scheme: light;
}

.dark {
  color-scheme: dark;
}

body {
  margin: 0;
  min-height: 100vh;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

a {
  color: inherit;
}
`;
}

export function kamodStylesheetContent(theme: KamodThemePreset = "default"): string {
  return `${kamodCssImports(theme)}\n${kamodBaseStyles()}\n`;
}
