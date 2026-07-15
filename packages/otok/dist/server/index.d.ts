import type { Handler } from "hono";
import { Hono } from "hono";
import { type ViteManifest } from "./html.js";
import { type OtokRoute } from "../shared/routes.js";
export interface CreateOtokHandlerOptions {
    routes: OtokRoute[];
    manifest?: ViteManifest;
    clientEntry?: string;
    devClientEntry?: string;
    /** Stylesheet URLs to emit in dev before the client module loads. */
    devStylesheets?: string[];
    base?: string;
    notFound?: OtokRoute;
    notFoundRoute?: OtokRoute;
    errorRoute?: OtokRoute;
    /** Include theme bootstrap script and SSR dark-mode class from cookie. Defaults to false. */
    theme?: boolean;
    /** Expose unexpected Error.message values to the error route. Defaults to false. */
    exposeErrorDetails?: boolean;
}
export interface CreateOtokAppOptions extends CreateOtokHandlerOptions {
    staticDir?: string;
    assetsPath?: string;
    health?: boolean | Record<string, unknown>;
    /** Register API routes, middleware, or other Hono handlers before SSR. */
    configure?: (app: Hono) => void;
}
export declare function createOtokHandler(options: CreateOtokHandlerOptions): Handler;
export declare function createOtokApp(options: CreateOtokAppOptions): Hono;
export { pageHtml, type ViteManifest, type ViteManifestEntry } from "./html.js";
export { readOtokManifest, type ReadOtokManifestOptions } from "./manifest.js";
export { matchRoute, type RouteMatch } from "./router.js";
export { fail, isOtokHttpError, notFound, OtokHttpError, redirect } from "../shared/routes.js";
export type { InferLoaderData, LoaderResult, OtokChrome, OtokContext, OtokHead, OtokHeadLink, OtokHeadScript, OtokLayoutProps, OtokLoader, OtokPageProps, OtokRoute, RouteModule, RouteParams, } from "../shared/routes.js";
//# sourceMappingURL=index.d.ts.map