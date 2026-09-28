import { definePlugin } from "@kamod-ch/otok";
import type { ProgrammaticRouteDefinition } from "@kamod-ch/otok-config";
import { createDiscussions, type CreateDiscussionsOptions } from "./create-discussions.js";

const discussionsPluginFactory = definePlugin<CreateDiscussionsOptions>({
  name: "@kamod-ch/otok-discussions",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input == null || typeof input !== "object") {
        throw new Error("discussions() options must be an object");
      }
      const opts = input as CreateDiscussionsOptions;
      if (!opts.subjectType || !opts.adapter || !opts.runtime || !opts.auth) {
        throw new Error("discussions() requires subjectType, adapter, runtime, and auth");
      }
      return opts;
    },
  },
});

/**
 * Otok discussions plugin — SSR loaders/actions + optional JSON API.
 */
export default function discussionsPlugin(options: CreateDiscussionsOptions) {
  const extension = createDiscussions(options);
  const plugin = discussionsPluginFactory(options);

  plugin.registerRoutes = (): ProgrammaticRouteDefinition[] =>
    extension.routes.map((route) => ({
      id: route.id,
      path: route.path,
      pattern: route.pattern,
      params: route.params,
      module: route.module,
      layouts: route.layouts,
      middleware: route.middleware,
    }));

  plugin.configureApp = ({ app }) => {
    extension.configureJsonApi?.(app);
  };

  return plugin;
}

export type { CreateDiscussionsOptions };
