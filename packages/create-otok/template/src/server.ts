import { serve } from "@hono/node-server";
import { createOtokApp, readOtokManifest } from "otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
import "./style.css";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  devClientEntry: "/src/client.ts",
  devStylesheets: ["/src/style.css"],
  staticDir: "./dist/client",
  health: { ok: true, framework: "otok" },
  configure: (app) => {
    void applyAppPlugins(app);
    app.get("/plain-html", (c) => c.html("<!doctype html><title>Plain</title><p>No Otok page region</p>"));
  },
  theme: runtime.theme ?? true,
});

export default app;

if (import.meta.env.PROD) {
  const port = Number(process.env.PORT ?? 3000);
  const hostname = process.env.HOST || undefined;
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
