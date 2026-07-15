import type { Hono } from "hono";
import { h, type ComponentType } from "preact";
import {
  createOtokApp,
  type CreateOtokAppOptions,
  type LayoutModule,
  type LoaderResult,
  type MiddlewareModule,
  type OtokAction,
  type OtokLoader,
  type OtokPageProps,
  type OtokRoute,
  type RouteModule,
} from "otok/server";

export interface TestRouteInput<Data extends LoaderResult = LoaderResult> {
  /** Route manifest path, e.g. "/", "/users/:id", or "/docs/:slug*". */
  path: string;
  /** Override the generated regular expression. Useful for unusual fixtures. */
  pattern?: RegExp;
  /** Override param names. Inferred from `path` when omitted. */
  params?: string[];
  id?: string;
  component?: ComponentType<OtokPageProps<Data>>;
  module?: Partial<RouteModule<Data>> & { default?: ComponentType<OtokPageProps<Data>> };
  loader?: OtokLoader<Data>;
  action?: OtokAction;
  layouts?: LayoutModule[];
  middleware?: MiddlewareModule[];
}

export interface CreateTestAppOptions
  extends Omit<CreateOtokAppOptions, "routes" | "notFoundRoute" | "errorRoute"> {
  routes: Array<OtokRoute | TestRouteInput>;
  notFoundRoute?: OtokRoute | TestRouteInput;
  errorRoute?: OtokRoute | TestRouteInput;
}

export interface RenderRouteResult {
  response: Response;
  html: string;
}

const DefaultPage = ({ route }: OtokPageProps) => h("p", null, `Otok test route: ${route}`);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routePathToPattern(path: string): { pattern: RegExp; params: string[] } {
  const params: string[] = [];
  const segments = path.split("/").filter(Boolean);
  const patternParts = segments.map((segment) => {
    const dynamic = /^:([A-Za-z_$][\w$]*)(\*)?$/.exec(segment);
    if (!dynamic) return escapeRegex(segment);
    params.push(dynamic[1]);
    return dynamic[2] ? "(.+)" : "([^/]+)";
  });
  const source = patternParts.length > 0 ? `^/${patternParts.join("/")}/?$` : "^/?$";
  return { pattern: new RegExp(source), params };
}

export function createTestRoute<Data extends LoaderResult = LoaderResult>(input: TestRouteInput<Data>): OtokRoute {
  const inferred = routePathToPattern(input.path);
  const component = input.component ?? input.module?.default ?? DefaultPage;
  return {
    id: input.id ?? input.path,
    path: input.path,
    pattern: input.pattern ?? inferred.pattern,
    params: input.params ?? inferred.params,
    module: {
      default: component as RouteModule["default"],
      ...input.module,
      loader: input.loader ?? input.module?.loader,
      action: input.action ?? input.module?.action,
    } as RouteModule,
    layouts: input.layouts,
    middleware: input.middleware,
  };
}

function isOtokRoute(route: OtokRoute | TestRouteInput): route is OtokRoute {
  return route.pattern instanceof RegExp && "params" in route && "module" in route;
}

function normalizeRoute(route: OtokRoute | TestRouteInput | undefined): OtokRoute | undefined {
  if (!route) return undefined;
  return isOtokRoute(route) ? route : createTestRoute(route);
}

export function createTestApp(options: CreateTestAppOptions): Hono {
  return createOtokApp({
    ...options,
    routes: options.routes.map((route) => normalizeRoute(route) as OtokRoute),
    notFoundRoute: normalizeRoute(options.notFoundRoute),
    errorRoute: normalizeRoute(options.errorRoute),
  });
}

export async function requestRoute(
  appOrOptions: Hono | CreateTestAppOptions,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const app = "request" in appOrOptions ? appOrOptions : createTestApp(appOrOptions);
  return await app.request(path, init);
}

export async function renderRoute(
  appOrOptions: Hono | CreateTestAppOptions,
  path: string,
  init?: RequestInit,
): Promise<RenderRouteResult> {
  const response = await requestRoute(appOrOptions, path, init);
  return { response, html: await response.text() };
}

export type { OtokRoute } from "otok/server";
