import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createOtokHandler, type ViteManifest } from "otok/server";
import { routes } from "virtual:otok-routes";
import "./style.css";

function readManifest(): ViteManifest | undefined {
  if (!import.meta.env.PROD) return undefined;
  const manifestUrl = new URL("../client/.vite/manifest.json", import.meta.url);
  return JSON.parse(readFileSync(manifestUrl, "utf8")) as ViteManifest;
}

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true, framework: "otok" }));
app.use("/assets/*", serveStatic({ root: "./dist/client" }));
app.get(
  "*",
  createOtokHandler({
    routes,
    manifest: readManifest(),
    clientEntry: "src/client.ts",
    devClientEntry: "/src/client.ts",
  }),
);

export default app;

if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
}
