import { definePlugin } from "@kamod-ch/otok";
import type { Hono, Context } from "hono";
import { getSearchIndex, type SearchQuery } from "./index.js";

export interface SearchPluginOptions {
  searchPath?: string;
}

export function configureSearchApp(app: Hono, options: SearchPluginOptions = {}): void {
  const path = options.searchPath ?? "/api/search";
  app.get(path, (c: Context) => {
    const tenantId = c.req.query("tenantId");
    if (!tenantId) return c.json({ error: "tenantId required" }, 400);
    const query: SearchQuery = {
      tenantId,
      type: c.req.query("type") ?? undefined,
      q: c.req.query("q") ?? undefined,
      limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
    };
    return c.json({ hits: getSearchIndex().search(query) });
  });
}

const searchPluginFactory = definePlugin<SearchPluginOptions>({
  name: "@kamod-ch/otok-search",
  version: "0.1.0",
});

export default function searchPlugin(options: SearchPluginOptions = {}) {
  const plugin = searchPluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureSearchApp(app, options);
  };
  return plugin;
}
