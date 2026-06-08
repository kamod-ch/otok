import type { Handler } from "hono";
import { type ViteManifest } from "./html.js";
import type { OtokRoute } from "../shared/routes.js";
export interface CreateOtokHandlerOptions {
    routes: OtokRoute[];
    manifest?: ViteManifest;
    clientEntry?: string;
    devClientEntry?: string;
    base?: string;
    notFound?: OtokRoute;
}
export declare function createOtokHandler(options: CreateOtokHandlerOptions): Handler;
export { pageHtml, type ViteManifest, type ViteManifestEntry } from "./html.js";
export { matchRoute, type RouteMatch } from "./router.js";
export type { InferLoaderData, LoaderResult, OtokContext, OtokHead, OtokLoader, OtokPageProps, OtokRoute, RouteModule, RouteParams, } from "../shared/routes.js";
//# sourceMappingURL=index.d.ts.map