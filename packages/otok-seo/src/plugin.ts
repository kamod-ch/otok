import { definePlugin } from "otok";
import { configureSeoApp } from "./middleware.js";
import { normalizeSeoOptions, registerSeoRuntime } from "./registry.js";
import type { SeoPluginOptions } from "./types.js";

const seoPluginFactory = definePlugin<SeoPluginOptions>({
  name: "@kamod-ch/otok-seo",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("seo() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (typeof record.origin !== "string" || !record.origin) {
        throw new Error("seo() requires origin: string");
      }
      return normalizeSeoOptions(input as SeoPluginOptions);
    },
  },
});

/**
 * Otok SEO plugin factory.
 *
 * ```ts
 * import seo from "@kamod-ch/otok-seo";
 *
 * export default defineConfig({
 *   plugins: [seo({ origin: "https://example.com", titleTemplate: "%s | Example" })],
 * });
 * ```
 */
export default function seo(options: SeoPluginOptions) {
  const normalized = normalizeSeoOptions(options);
  registerSeoRuntime(normalized);

  const plugin = seoPluginFactory(normalized);
  plugin.configureApp = ({ app }) => {
    configureSeoApp(app, normalized);
  };
  return plugin;
}

export { configureSeoApp };
