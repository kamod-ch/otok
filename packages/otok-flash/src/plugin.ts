import { definePlugin } from "otok";
import { createFlashMiddleware, type FlashMiddlewareOptions } from "./middleware.js";

export type FlashPluginOptions = FlashMiddlewareOptions;

const flashPluginFactory = definePlugin<FlashPluginOptions>({
  name: "@kamod-ch/otok-flash",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("flash() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (typeof record.secret !== "string" || !record.secret) {
        throw new Error("flash() requires secret: string");
      }
      return input as FlashPluginOptions;
    },
  },
});

/**
 * Otok flash plugin — mounts signed flash-cookie middleware on the Hono app.
 *
 * ```ts
 * import flash from "@kamod-ch/otok-flash";
 *
 * export default defineConfig({
 *   plugins: [flash({ secret: process.env.FLASH_SECRET! })],
 * });
 * ```
 */
export default function flash(options: FlashPluginOptions) {
  const plugin = flashPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    app.use("*", createFlashMiddleware(options));
  };
  return plugin;
}
