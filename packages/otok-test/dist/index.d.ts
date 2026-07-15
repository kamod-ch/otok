import type { Hono } from "hono";
import { type ComponentType } from "preact";
import { type CreateOtokAppOptions, type LayoutModule, type LoaderResult, type MiddlewareModule, type OtokAction, type OtokLoader, type OtokPageProps, type OtokRoute, type RouteModule } from "otok/server";
export interface TestRouteInput<Data extends LoaderResult = LoaderResult> {
    /** Route manifest path, e.g. "/", "/users/:id", or "/docs/:slug*". */
    path: string;
    /** Override the generated regular expression. Useful for unusual fixtures. */
    pattern?: RegExp;
    /** Override param names. Inferred from `path` when omitted. */
    params?: string[];
    id?: string;
    component?: ComponentType<OtokPageProps<Data>>;
    module?: Partial<RouteModule<Data>> & {
        default?: ComponentType<OtokPageProps<Data>>;
    };
    loader?: OtokLoader<Data>;
    action?: OtokAction;
    layouts?: LayoutModule[];
    middleware?: MiddlewareModule[];
}
export interface CreateTestAppOptions extends Omit<CreateOtokAppOptions, "routes" | "notFoundRoute" | "errorRoute"> {
    routes: Array<OtokRoute | TestRouteInput>;
    notFoundRoute?: OtokRoute | TestRouteInput;
    errorRoute?: OtokRoute | TestRouteInput;
}
export interface RenderRouteResult {
    response: Response;
    html: string;
}
export declare function createTestRoute<Data extends LoaderResult = LoaderResult>(input: TestRouteInput<Data>): OtokRoute;
export declare function createTestApp(options: CreateTestAppOptions): Hono;
export declare function requestRoute(appOrOptions: Hono | CreateTestAppOptions, path: string, init?: RequestInit): Promise<Response>;
export declare function renderRoute(appOrOptions: Hono | CreateTestAppOptions, path: string, init?: RequestInit): Promise<RenderRouteResult>;
export type { OtokRoute } from "otok/server";
//# sourceMappingURL=index.d.ts.map