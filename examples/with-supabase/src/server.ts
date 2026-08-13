import { createOtokApp } from "@kamod-ch/otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { routes, notFoundRoute, errorRoute } from "virtual:otok-routes";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

export default createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  ...runtime,
  configure: (app) => {
    void applyAppPlugins(app);
  },
});
