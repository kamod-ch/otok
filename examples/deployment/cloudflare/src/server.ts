import { createOtokWorkerApp, resolveOtokManifest, type ViteManifest } from "@kamod-ch/otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
import clientManifest from "../dist/client/.vite/manifest.json";
import "./style.css";

/**
 * Cloudflare Worker entry.
 * Client assets are served by Workers Assets (`wrangler.toml` [assets]).
 * The Vite client manifest is imported (not read via Node fs) so this stays Edge-safe.
 */
const app = createOtokWorkerApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: resolveOtokManifest(clientManifest as ViteManifest, {
    prodOnly: false,
  }),
  clientEntry: "src/client.ts",
  health: { ok: true, runtime: "cloudflare" },
  streaming: true,
});

export default app;
