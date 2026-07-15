import type { Plugin } from "vite";
export interface OtokPluginOptions {
    appDir?: string;
    routesDir?: string;
    islandsDir?: string;
}
interface RouteEntry {
    id: string;
    file: string;
    routePath: string;
    routePattern: string;
    pattern: string;
    params: string[];
    score: number;
    layouts: string[];
    middleware: string[];
}
interface RoutesScanResult {
    routes: RouteEntry[];
    notFoundRoute?: RouteEntry;
    errorRoute?: RouteEntry;
}
declare function scanRoutes(root: string, routesDir: string): RoutesScanResult;
export interface RouteBuildOptions {
    params?: Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>;
    query?: Record<string, string | number | boolean | Array<string | number | boolean | null | undefined> | null | undefined>;
    hash?: string;
}
export declare function buildRoutePath(pattern: string, options?: RouteBuildOptions): string;
declare function generateRoutesModule(scan: RoutesScanResult): string;
declare function injectIslandId(code: string, id: string): string;
export default function otok(options?: OtokPluginOptions): Plugin;
export { otok };
export declare const __testing: {
    buildRoutePath: typeof buildRoutePath;
    generateRoutesModule: typeof generateRoutesModule;
    injectIslandId: typeof injectIslandId;
    scanRoutes: typeof scanRoutes;
};
//# sourceMappingURL=index.d.ts.map