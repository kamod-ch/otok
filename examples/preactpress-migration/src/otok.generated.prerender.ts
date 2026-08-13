import { createOtokApp, readOtokManifest } from "@kamod-ch/otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  health: false,
  theme: runtime.theme ?? true,
  configure: (app) => {
    void applyAppPlugins(app);
  },
});

export default app;
