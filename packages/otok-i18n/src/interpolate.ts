import type { TranslateValues } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const str = String(value);
  return escapeHtml(str);
}

/**
 * Replace `{name}` placeholders safely (HTML-escaped values).
 * Does not interpret HTML in the template — output is safe for text nodes.
 */
export function interpolate(template: string, values: TranslateValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in values)) return `{${key}}`;
    return formatValue(values[key]);
  });
}
