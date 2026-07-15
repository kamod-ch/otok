import { serve } from "@hono/node-server";
import { createOtokApp, json, readOtokManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
import { audits } from "./app/data/audits";
import "./style.css";

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  devClientEntry: "/src/client.ts",
  devStylesheets: ["/src/style.css"],
  staticDir: "./dist/client",
  health: { ok: true, app: "reference-ai-audit" },
  configure: (app) => {
    app.get("/api/audits", (c) => json({ audits: audits.list() }));
    app.get("/api/audits/:id", (c) => json({ audit: audits.get(c.req.param("id")) }));
  },
});

export default app;

if (import.meta.env.PROD) {
  const port = Number(process.env.PORT ?? 3000);
  const hostname = process.env.HOST || undefined;
  const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.info(`AI audit reference listening on http://${info.address}:${info.port}`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.info(`Received ${signal}; shutting down...`);
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
