import { OtokHttpError, type OtokRoute, type RouteParams } from "../shared/routes.js";

export interface RouteMatch {
  route: OtokRoute;
  params: RouteParams;
}

function decodeRouteParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new OtokHttpError(400, "Invalid route parameter encoding");
  }
}

export function matchRoute(routes: OtokRoute[], pathname: string): RouteMatch | undefined {
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params: RouteParams = {};
    route.params.forEach((name, index) => {
      params[name] = decodeRouteParam(match[index + 1] ?? "");
    });
    return { route, params };
  }
  return undefined;
}
