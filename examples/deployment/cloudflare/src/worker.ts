/**
 * Cloudflare Worker entry sketch. Build client assets separately and serve them
 * from Pages/R2/CDN — do not use createOtokApp({ staticDir }) on Workers.
 */
import { createOtokWorkerApp } from "otok/server";

// In a real worker, import generated routes from the Vite virtual module bundle.
declare const routes: [];
declare const notFoundRoute: undefined;
declare const errorRoute: undefined;

const app = createOtokWorkerApp({
  routes,
  notFoundRoute,
  errorRoute,
  clientEntry: "src/client.ts",
  health: { ok: true, runtime: "cloudflare" },
  streaming: true,
});

export default {
  fetch: app.fetch,
};
