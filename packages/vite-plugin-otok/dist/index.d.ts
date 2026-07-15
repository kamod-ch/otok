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
declare function generateRoutesModule(scan: RoutesScanResult): string;
declare function injectIslandId(code: string, id: string): string;
export default function otok(options?: OtokPluginOptions): Plugin;
export { otok };
export declare const __testing: {
    generateRoutesModule: typeof generateRoutesModule;
    injectIslandId: typeof injectIslandId;
    scanRoutes: typeof scanRoutes;
};
//# sourceMappingURL=index.d.ts.map