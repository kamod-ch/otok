import { serve } from "@hono/node-server";
import { createOtokApp, readOtokManifest } from "@kamod-ch/otok/server";
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
  health: { ok: true, framework: "otok", integration: "kamod" },
  theme: runtime.theme ?? true,
  configure: (app) => {
    void applyAppPlugins(app);
  },
});

export default app;

if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
}
