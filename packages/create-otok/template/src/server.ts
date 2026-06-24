import { serve } from "@hono/node-server";
import { createOtokApp, readOtokManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
import "./style.css";

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  devClientEntry: "/src/client.ts",
  staticDir: "./dist/client",
  health: { ok: true, framework: "otok" },
  theme: true,
});

export default app;

if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
}
