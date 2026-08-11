import { serve } from "@hono/node-server";
import { createOtokAppAsync, readOtokManifest } from "otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const { runtime, applyAppPlugins, collectPluginRoutes, transformHtml } = await loadOtokResolvedConfig();
const pluginRoutes = await collectPluginRoutes();

const app = await createOtokAppAsync({
  routes: [...routes, ...(pluginRoutes as typeof routes)],
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  devClientEntry: "/src/client.ts",
  devStylesheets: ["/src/styles.css"],
  staticDir: "./dist/client",
  assetCacheControl: "public, max-age=31536000, immutable",
  health: { ok: true, runtime: "node", adapter: "otok-adapter-node" },
  transformHtml,
  configure: (app) => applyAppPlugins(app),
  theme: runtime.theme ?? true,
});

export default app;

if (import.meta.env.PROD) {
  const port = Number(process.env.PORT ?? "5173");
  const hostname = process.env.HOST ?? "0.0.0.0";
  const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.info(`Otok server listening on http://${info.address}:${info.port}`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.info(`Received ${signal}; shutting down Otok server...`);
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
