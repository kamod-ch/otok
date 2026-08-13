import { definePlugin } from "@kamod-ch/otok";
import { configureSecurityApp } from "./middleware.js";
import type { SecurityPluginOptions } from "./types.js";

const securityPluginFactory = definePlugin<SecurityPluginOptions>({
  name: "@kamod-ch/otok-security",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (input != null && typeof input !== "object") {
        throw new Error("security() options must be an object");
      }
      return (input ?? {}) as SecurityPluginOptions;
    },
  },
});

/**
 * Otok security plugin — secure defaults with explicit opt-out.
 *
 * ```ts
 * import security from "@kamod-ch/otok-security";
 *
 * export default defineConfig({
 *   plugins: [security({ trustedHosts: ["example.com"], cors: { origin: "https://app.example.com" } })],
 * });
 * ```
 */
export default function security(options: SecurityPluginOptions = {}) {
  const plugin = securityPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureSecurityApp(app, options);
  };
  return plugin;
}

export { configureSecurityApp };
