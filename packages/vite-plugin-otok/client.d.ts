declare module "virtual:otok-routes" {
  import type { OtokRoute } from "otok/server";

  export const routePaths: readonly string[];
  export type OtokRoutePath = (typeof routePaths)[number];
  export const routes: OtokRoute[];
  export const notFoundRoute: OtokRoute | undefined;
  export const errorRoute: OtokRoute | undefined;
}

declare module "virtual:otok-islands" {
  import type { IslandRegistry } from "otok/client";

  export const islandModules: IslandRegistry;
  export default islandModules;
}
