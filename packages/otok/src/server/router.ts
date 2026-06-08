import type { OtokRoute, RouteParams } from "../shared/routes.js";

export interface RouteMatch {
  route: OtokRoute;
  params: RouteParams;
}

export function matchRoute(routes: OtokRoute[], pathname: string): RouteMatch | undefined {
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params: RouteParams = {};
    route.params.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] ?? "");
    });
    return { route, params };
  }
  return undefined;
}
