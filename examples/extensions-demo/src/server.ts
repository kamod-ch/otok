import { createOtokApp } from "otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { routes, notFoundRoute, errorRoute } from "virtual:otok-routes";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  ...runtime,
  configure: (app) => {
    void applyAppPlugins(app);
  },
});

export default app;
