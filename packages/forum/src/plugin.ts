import { definePlugin } from "otok";
import type { ProgrammaticRouteDefinition } from "@otok/config";
import { createForum, type CreateForumOptions } from "./index.js";
import { injectForumTheme } from "./index.js";

const forumPluginFactory = definePlugin<CreateForumOptions>({
  name: "@otok/forum",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input == null || typeof input !== "object") {
        throw new Error("forum() options must be an object with storage and auth adapters");
      }
      const opts = input as CreateForumOptions;
      if (!opts.storage || !opts.auth) {
        throw new Error("forum() requires storage and auth adapters");
      }
      return opts;
    },
  },
});

/**
 * Otok forum plugin — registers programmatic SSR routes via ADR 0007.
 *
 * ```ts
 * import forum from "@otok/forum/plugin";
 *
 * export default defineConfig({
 *   plugins: [forum({ basePath: "/community", storage, auth })],
 * });
 * ```
 */
export default function forumPlugin(options: CreateForumOptions) {
  const extension = createForum(options);
  const plugin = forumPluginFactory(options);

  plugin.registerRoutes = (): ProgrammaticRouteDefinition[] =>
    extension.routes.map((route) => ({
      id: route.id,
      path: route.path,
      pattern: route.pattern,
      params: route.params,
      module: route.module,
      layouts: route.layouts,
      middleware: [...extension.middleware, ...(route.middleware ?? [])],
    }));

  plugin.transformHtml = (html) => injectForumTheme(html);

  return plugin;
}

export type { CreateForumOptions };
