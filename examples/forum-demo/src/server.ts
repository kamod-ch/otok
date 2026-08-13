import { serve } from "@hono/node-server";
import { createOtokApp, readOtokManifest } from "@kamod-ch/otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const { runtime, applyAppPlugins, collectPluginRoutes } = await loadOtokResolvedConfig();
const pluginRoutes = await collectPluginRoutes();

// Merge plugin routes (forum) with file routes
function toOtokRoutes(defs: typeof pluginRoutes) {
  return defs.map((d) => ({
    id: d.id,
    path: d.path,
    pattern: d.pattern ?? new RegExp(`^${d.path}/?$`),
    params: d.params ?? [],
    module: d.module,
    layouts: d.layouts,
    middleware: d.middleware,
  }));
}

const app = createOtokApp({
  routes: [...routes, ...toOtokRoutes(pluginRoutes)],
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  staticDir: "./dist/client",
  configure: (app) => {
    void applyAppPlugins(app);
    app.get("/", (c) => c.redirect("/community", 302));
  },
});

export default app;

if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: 3456 }, () => {
    console.info("Forum demo: http://localhost:3456/community");
  });
}
