import type { OtokRoute, RouteParams } from "../shared/routes.js";
export interface RouteMatch {
    route: OtokRoute;
    params: RouteParams;
}
export declare function matchRoute(routes: OtokRoute[], pathname: string): RouteMatch | undefined;
//# sourceMappingURL=router.d.ts.map