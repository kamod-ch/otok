import type { Formatters } from "./types.js";

export function createFormatters(locale: string): Formatters {
  return {
    formatDate(value, options) {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(locale, options).format(date);
    },
    formatTime(value, options) {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(locale, { ...options, timeStyle: options?.timeStyle ?? "medium" }).format(date);
    },
    formatNumber(value, options) {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    formatPercent(value, options) {
      return new Intl.NumberFormat(locale, { ...options, style: "percent" }).format(value);
    },
    formatCurrency(value, currency, options) {
      return new Intl.NumberFormat(locale, { ...options, style: "currency", currency }).format(value);
    },
  };
}

/** BCP 47 direction hint for RTL preparation. */
export function localeDirection(locale: string): "ltr" | "rtl" {
  try {
    const localeObj = new Intl.Locale(locale);
    if ("textInfo" in localeObj && localeObj.textInfo && typeof localeObj.textInfo === "object") {
      const direction = (localeObj.textInfo as { direction?: string }).direction;
      if (direction === "rtl") return "rtl";
    }
  } catch {
    // Intl.Locale may not support textInfo in all runtimes
  }
  const rtlPrefixes = ["ar", "he", "fa", "ur", "yi"];
  const primary = locale.split("-")[0]?.toLowerCase();
  return rtlPrefixes.includes(primary ?? "") ? "rtl" : "ltr";
}
