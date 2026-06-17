import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { createOtokApp, type ViteManifest } from "otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
import "./style.css";

function readManifest(): ViteManifest | undefined {
  if (!import.meta.env.PROD) return undefined;
  const manifestUrl = new URL("../client/.vite/manifest.json", import.meta.url);
  return JSON.parse(readFileSync(manifestUrl, "utf8")) as ViteManifest;
}

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: readManifest(),
  clientEntry: "src/client.ts",
  devClientEntry: "/src/client.ts",
  staticDir: "./dist/client",
  health: { ok: true, framework: "otok" },
});

export default app;

if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
}
