import type { OtokRoute, RouteModule } from "@kamod-ch/otok/server";
import { normalizeBasePath } from "../http/utils.js";

export function routePattern(base: string, suffix: string): { path: string; pattern: RegExp; params: string[] } {
  const full = `${normalizeBasePath(base)}${suffix}`.replace(/\/+/g, "/") || "/";
  const paramNames: string[] = [];
  const regex = full.replace(/:([a-zA-Z]+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return {
    path: full,
    pattern: new RegExp(`^${regex}/?$`),
    params: paramNames,
  };
}

export function makeDiscussionRoute(
  id: string,
  basePath: string,
  suffix: string,
  module: RouteModule,
  middleware?: OtokRoute["middleware"],
): OtokRoute {
  const { path, pattern, params } = routePattern(basePath, suffix);
  return { id, path, pattern, params, module, middleware };
}

export function collectDiscussionRoutePaths(basePath: string): string[] {
  const base = normalizeBasePath(basePath);
  return [
    `${base}/:subjectId`,
    `${base}/:subjectId/thread`,
    `${base}/:subjectId/replies/:commentId`,
    `${base}/:subjectId/comment/:commentId`,
  ];
}
