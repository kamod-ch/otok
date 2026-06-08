/// <reference types="vite/client" />

declare module "virtual:otok-routes" {
  import type { OtokRoute } from "otok/server";

  export const routes: OtokRoute[];
}

declare module "virtual:otok-islands" {
  import type { IslandRegistry } from "otok/client";

  export const islandModules: IslandRegistry;
  export default islandModules;
}
