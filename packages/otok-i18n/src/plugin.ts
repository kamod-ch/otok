import { definePlugin } from "@kamod-ch/otok";
import { configureI18nApp } from "./middleware.js";
import type { I18nPluginOptions } from "./types.js";

const i18nPluginFactory = definePlugin<I18nPluginOptions>({
  name: "@kamod-ch/otok-i18n",
  version: "2.0.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("i18n() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!Array.isArray(record.locales) || record.locales.length === 0) {
        throw new Error("i18n() requires locales: string[]");
      }
      if (typeof record.defaultLocale !== "string") {
        throw new Error("i18n() requires defaultLocale: string");
      }
      if (!record.messages || typeof record.messages !== "object") {
        throw new Error("i18n() requires messages: Record<locale, loader>");
      }
      const locales = record.locales as string[];
      if (!locales.includes(record.defaultLocale as string)) {
        throw new Error("i18n() defaultLocale must be in locales");
      }
      if (record.fallbackLocale != null && !locales.includes(record.fallbackLocale as string)) {
        throw new Error("i18n() fallbackLocale must be in locales");
      }
      const routing = record.routing as string | undefined;
      if (routing != null && !["prefix", "prefix-except-default", "domain", "none"].includes(routing)) {
        throw new Error(`i18n() invalid routing mode: ${routing}`);
      }
      return input as I18nPluginOptions;
    },
  },
});

/**
 * Otok i18n plugin factory.
 *
 * ```ts
 * import i18n from "@kamod-ch/otok-i18n";
 *
 * export default defineConfig({
 *   plugins: [i18n({ locales: ["de", "en"], defaultLocale: "de", messages: { ... } })],
 * });
 * ```
 */
export default function i18n(options: I18nPluginOptions) {
  const plugin = i18nPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureI18nApp(app, options);
  };
  return plugin;
}

export { configureI18nApp };
