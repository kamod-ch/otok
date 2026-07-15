import { serveStatic } from "@hono/node-server/serve-static";
import type { Context, Handler } from "hono";
import { Hono } from "hono";
import { h } from "preact";
import type { ComponentType, VNode } from "preact";
import renderToString from "preact-render-to-string";
import { pageHtml, type ViteManifest } from "./html.js";
import { matchRoute } from "./router.js";
import { withIslandRenderContext } from "../shared/island-context.js";
import {
  isOtokHttpError,
  json,
  type ActionResult,
  type LoaderResult,
  type MiddlewareModule,
  type OtokActionContext,
  type OtokChrome,
  type OtokContext,
  type OtokHead,
  type OtokMiddleware,
  type OtokRoute,
} from "../shared/routes.js";
import { OTOK_PAGE_ATTR } from "../shared/navigation.js";
import { resolveDarkModeFromCookie } from "../shared/theme.js";

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
  /** Cache-Control for static assets served from staticDir. Defaults to immutable hashed-asset caching. */
  assetCacheControl?: string;
  health?: boolean | Record<string, unknown>;
  /** Register API routes, middleware, or other Hono handlers before SSR. */
  configure?: (app: Hono) => void;
}

async function resolveHead(route: OtokRoute, data: LoaderResult, params: Record<string, string>): Promise<OtokHead> {
  if (!route.module.head) return { title: "Otok App" };
  return await route.module.head({
    data,
    params,
    route: route.path,
  });
}

async function resolveChrome(
  route: OtokRoute,
  data: LoaderResult,
  params: Record<string, string>,
): Promise<OtokChrome | undefined> {
  if (!route.module.chrome) return undefined;
  return await route.module.chrome({
    data,
    params,
    route: route.path,
  });
}

export function createOtokHandler(options: CreateOtokHandlerOptions): Handler {
  return async (c: Context) => {
    const url = new URL(c.req.url);
    const match = matchRoute(options.routes, url.pathname);

    try {
      if (!match) {
        const notFoundRoute = options.notFoundRoute ?? options.notFound;
        if (!notFoundRoute) return c.notFound();
        return await renderRoute(c, notFoundRoute, {}, options, 404);
      }

      if (isActionRequest(c.req.method)) {
        return await runRouteMiddleware(c, match.route, () => handleAction(c, match.route, match.params, options));
      }

      return await runRouteMiddleware(c, match.route, () => renderRoute(c, match.route, match.params, options));
    } catch (error) {
      return handleRenderError(c, error, options);
    }
  };
}

type ActionMethod = "POST" | "PUT" | "PATCH" | "DELETE";

function isActionRequest(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

function resolveActionMethod(method: string, formData: FormData | undefined): ActionMethod {
  const override = formData?.get("_method");
  const candidate = typeof override === "string" ? override.toUpperCase() : method.toUpperCase();
  if (candidate === "PUT" || candidate === "PATCH" || candidate === "DELETE") return candidate;
  return "POST";
}

function isFormRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

async function resolveActionFormData(request: Request): Promise<FormData | undefined> {
  if (!isFormRequest(request)) return undefined;
  return await request.clone().formData();
}

async function handleAction(
  c: Context,
  route: OtokRoute,
  params: Record<string, string>,
  options: CreateOtokHandlerOptions,
): Promise<Response> {
  if (!route.module.action) {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const formData = await resolveActionFormData(c.req.raw);
  const context: OtokActionContext = {
    hono: c,
    request: c.req.raw,
    params,
    route: route.path,
    method: resolveActionMethod(c.req.method, formData),
    formData,
  };

  try {
    const result = await route.module.action(context);
    if (result instanceof Response) return result;
    return await renderRoute(c, route, params, options, statusForActionResult(result), undefined, result);
  } catch (error) {
    if (isOtokHttpError(error) && error.headers.has("location")) {
      return new Response(null, { status: error.status, headers: error.headers });
    }
    if (isOtokHttpError(error) && error.failure && error.status !== 404) {
      return await renderRoute(c, route, params, options, error.status, undefined, error.failure);
    }
    throw error;
  }
}

function statusForActionResult(result: ActionResult): number {
  return typeof result === "object" && result !== null && "status" in result && typeof result.status === "number"
    ? result.status
    : 200;
}

function middlewareFromModule(module: MiddlewareModule): OtokMiddleware | undefined {
  return module.default ?? module.middleware;
}

async function runRouteMiddleware(c: Context, route: OtokRoute, render: () => Promise<Response>): Promise<Response> {
  const stack = (route.middleware ?? []).map(middlewareFromModule).filter((middleware): middleware is OtokMiddleware => Boolean(middleware));
  let index = -1;

  const dispatch = async (position: number): Promise<Response> => {
    if (position <= index) throw new Error("otok: middleware next() called multiple times.");
    index = position;
    const middleware = stack[position];
    if (!middleware) return await render();

    let downstream: Response | undefined;
    const result = await middleware(c, async () => {
      downstream = await dispatch(position + 1);
    });

    if (result instanceof Response) return result;
    if (downstream) return downstream;
    return c.res;
  };

  return dispatch(0);
}

async function renderRoute(
  c: Context,
  route: OtokRoute,
  params: Record<string, string>,
  options: CreateOtokHandlerOptions,
  status = 200,
  dataOverride?: LoaderResult,
  actionData?: ActionResult,
): Promise<Response> {
  const context: OtokContext = {
    hono: c,
    request: c.req.raw,
    params,
    route: route.path,
  };
  const data = dataOverride ?? (route.module.loader ? await route.module.loader(context) : {});
  if (data instanceof Response) return data;
  const head = await resolveHead(route, data, params);
  const chrome = await resolveChrome(route, data, params);
  const Page = route.module.default;
  const props = { data, actionData, params, route: route.path, chrome };
  const islandContext = { islands: new Set<string>(), nextIslandId: 0 };
  const body = withIslandRenderContext(islandContext, () => {
    let tree: VNode<any> = h(
      "div",
      { [OTOK_PAGE_ATTR]: "" },
      h(Page as ComponentType<typeof props>, props),
    );
    for (const layout of [...(route.layouts ?? [])].reverse()) {
      tree = h(layout.default as ComponentType<typeof props & { children: VNode<any> }>, {
        ...props,
        children: tree,
      });
    }
    return renderToString(tree);
  });
  const themeEnabled = options.theme ?? false;
  const html = pageHtml({
    body,
    head,
    islands: [...islandContext.islands],
    manifest: options.manifest,
    clientEntry: options.clientEntry,
    devClientEntry: options.devClientEntry,
    devStylesheets: options.devStylesheets,
    base: options.base,
    client: route.module.client === true,
    theme: themeEnabled,
    darkMode: themeEnabled ? resolveDarkModeFromCookie(c.req.header("cookie")) : false,
  });

  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

async function handleRenderError(
  c: Context,
  error: unknown,
  options: CreateOtokHandlerOptions,
): Promise<Response> {
  if (isOtokHttpError(error)) {
    const location = error.headers.get("location");
    if (location) {
      return new Response(null, { status: error.status, headers: error.headers });
    }

    if (error.status === 404) {
      const notFoundRoute = options.notFoundRoute ?? options.notFound;
      if (notFoundRoute) return renderFallbackRoute(c, notFoundRoute, options, 404, { message: error.message });
    }

    if (options.errorRoute) {
      return renderFallbackRoute(c, options.errorRoute, options, error.status, error.failure ?? {
        message: error.message,
        status: error.status,
      });
    }

    if (error.failure) return json(error.failure, { status: error.status, headers: error.headers });
    return new Response(error.message, { status: error.status, headers: error.headers });
  }

  if (options.errorRoute) {
    const message = options.exposeErrorDetails === true && error instanceof Error ? error.message : "Internal server error";
    return renderFallbackRoute(c, options.errorRoute, options, 500, { message, status: 500 });
  }

  throw error;
}

async function renderFallbackRoute(
  c: Context,
  route: OtokRoute,
  options: CreateOtokHandlerOptions,
  status: number,
  data: LoaderResult,
): Promise<Response> {
  try {
    return await renderRoute(c, route, {}, options, status, data);
  } catch {
    return new Response(status === 404 ? "Not found" : "Internal server error", { status });
  }
}

export function createOtokApp(options: CreateOtokAppOptions): Hono {
  const app = new Hono();

  options.configure?.(app);

  if (options.health) {
    const payload = typeof options.health === "object" ? options.health : { ok: true, framework: "otok" };
    app.get("/api/health", (c) => c.json(payload));
  }

  if (options.staticDir) {
    const assetsPath = options.assetsPath ?? "/assets";
    const cacheControl = options.assetCacheControl ?? "public, max-age=31536000, immutable";
    app.use(`${assetsPath}/*`, async (c, next) => {
      await next();
      if (c.res.status < 400 && !c.res.headers.has("cache-control")) c.header("cache-control", cacheControl);
    });
    app.use(`${assetsPath}/*`, serveStatic({ root: options.staticDir }));
  }

  app.all("*", createOtokHandler(options));
  return app;
}

export { pageHtml, type ViteManifest, type ViteManifestEntry } from "./html.js";
export { readOtokManifest, type ReadOtokManifestOptions } from "./manifest.js";
export { matchRoute, type RouteMatch } from "./router.js";
export { defineMiddleware, fail, isOtokHttpError, isOtokResponse, json, notFound, OtokHttpError, redirect } from "../shared/routes.js";
export type {
  ActionResult,
  InferLoaderData,
  LoaderResult,
  MiddlewareModule,
  OtokAction,
  OtokActionContext,
  OtokFailure,
  OtokResponse,
  OtokChrome,
  OtokContext,
  OtokMiddleware,
  OtokHead,
  OtokHeadLink,
  OtokHeadScript,
  OtokLayoutProps,
  OtokLoader,
  OtokPageProps,
  OtokRoute,
  RouteModule,
  RouteParams,
} from "../shared/routes.js";
