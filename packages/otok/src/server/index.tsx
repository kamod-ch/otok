import type { Context, Handler } from "hono";
import { Hono } from "hono";
import { h, Fragment } from "preact";
import type { ComponentType, VNode } from "preact";
import renderToString from "preact-render-to-string";
import { composeDeferredHtmlStream, composeHtmlStream, pageHtml, type ViteManifest } from "./html.js";
import { matchRoute } from "./router.js";
import {
  applyCacheHeaders,
  buildRenderContext,
  logRenderingWarnings,
  readCachedHtml,
  resolveRouteRendering,
  writeCachedHtml,
  type HandlerRenderOptions,
} from "./rendering.js";
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
import type { RenderingConfig } from "../rendering/types.js";
import {
  hasDeferredSlots,
  resolveDeferredData,
  splitHtmlAtDeferredMarkers,
  unwrapImmediateData,
  withDeferredRenderContext,
  type DeferredRenderContext,
} from "../rendering/index.js";
import { OTOK_PAGE_ATTR } from "../shared/navigation.js";
import {
  buildDataResponse,
  dataResponseFromActionResult,
  dataResponseFromError,
  dataResponseFromRedirect,
  wantsDataResponse,
} from "./data-response.js";
import { resolveIdempotencyKey, withIdempotency } from "./idempotency.js";
import { serializeLoaderData } from "../shared/mutations.js";
import { resolveDarkModeFromCookie } from "../shared/theme.js";
import {
  detectLocaleFromHtml,
  detectRenderMode,
  extractIslandIdsFromHtml,
  otokDevtoolsBeginRequest,
  otokDevtoolsEnabled,
  otokDevtoolsFinishRequest,
  otokDevtoolsRecordLoader,
  otokDevtoolsRecordMiddleware,
  otokDevtoolsSetRoutes,
  sanitizeAuthSnapshot,
} from "../devtools/bridge.js";

interface ActiveDevtoolsTrace {
  requestId: string;
  route: string;
  middlewareMs: number;
  loaderMs: number;
  renderMs: number;
  requestStartedAt: number;
}

let activeDevtoolsTrace: ActiveDevtoolsTrace | null = null;

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
  /**
   * Stream HTML with a buffered shell and streamed body.
   * Defaults to false for maximum compatibility.
   */
  streaming?: boolean;
  /** Default rendering config merged with per-route `defineRendering()`. */
  rendering?: RenderingConfig;
  /** Active adapter capabilities for route rendering validation. */
  adapterCapabilities?: ReadonlySet<string>;
  /**
   * Transform buffered SSR HTML after `pageHtml()` (ADR 0007).
   * Not applied to streaming responses.
   */
  transformHtml?: (
    html: string,
    meta: { pathname: string; routeId?: string },
  ) => string | Promise<string>;
}

type RenderHandlerOptions = CreateOtokHandlerOptions & HandlerRenderOptions;

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
    loaderData: data,
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
    loaderData: data,
    params,
    route: route.path,
  });
}

/**
 * Otok handlers often return `new Response(...)`. Cookies and other headers set
 * via Hono helpers (`setCookie`, `c.header`) live on `c.res` and would otherwise
 * be dropped. Merge them onto the final response.
 */
function mergeContextHeaders(c: Context, response: Response): Response {
  if (response === c.res) return response;

  const pending = c.res.headers;
  if ([...pending.keys()].length === 0) return response;

  const headers = new Headers(response.headers);
  for (const cookie of pending.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  for (const [key, value] of pending.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createOtokHandler(options: CreateOtokHandlerOptions): Handler {
  if (otokDevtoolsEnabled()) otokDevtoolsSetRoutes(options.routes);

  return async (c: Context) => {
    const url = new URL(c.req.url);
    const match = matchRoute(options.routes, url.pathname);
    const requestId = otokDevtoolsBeginRequest(c.req.method, url.pathname);
    const trace: ActiveDevtoolsTrace | null = requestId
      ? {
          requestId,
          route: match?.route.path ?? url.pathname,
          middlewareMs: 0,
          loaderMs: 0,
          renderMs: 0,
          requestStartedAt: performance.now(),
        }
      : null;
    activeDevtoolsTrace = trace;

    try {
      if (!match) {
        const notFoundRoute = options.notFoundRoute ?? options.notFound;
        if (!notFoundRoute) {
          const response = mergeContextHeaders(c, await c.notFound());
          await finalizeDevtoolsRequest(trace, c, response, undefined);
          return response;
        }
        if (trace) trace.route = notFoundRoute.path;
        const response = mergeContextHeaders(c, await renderRoute(c, notFoundRoute, {}, options, 404));
        await finalizeDevtoolsRequest(trace, c, response, notFoundRoute.module);
        return response;
      }

      if (trace) trace.route = match.route.path;

      if (isActionRequest(c.req.method)) {
        const response = mergeContextHeaders(
          c,
          await runRouteMiddleware(c, match.route, () => handleAction(c, match.route, match.params, options)),
        );
        await finalizeDevtoolsRequest(trace, c, response, match.route.module);
        return response;
      }

      const response = mergeContextHeaders(
        c,
        await runRouteMiddleware(c, match.route, () => renderRoute(c, match.route, match.params, options)),
      );
      await finalizeDevtoolsRequest(trace, c, response, match.route.module);
      return response;
    } catch (error) {
      const response = mergeContextHeaders(c, await handleRenderError(c, error, options));
      await finalizeDevtoolsRequest(trace, c, response, match?.route.module);
      return response;
    } finally {
      activeDevtoolsTrace = null;
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
  const idempotencyKey = resolveIdempotencyKey(c.req.raw, formData);
  const dataRequest = wantsDataResponse(c.req.raw);
  const context: OtokActionContext = {
    hono: c,
    request: c.req.raw,
    params,
    route: route.path,
    signal: c.req.raw.signal,
    method: resolveActionMethod(c.req.method, formData),
    formData,
    idempotencyKey,
  };

  return withIdempotency(idempotencyKey, async () => {
    try {
      const result = await route.module.action!(context);
      if (result instanceof Response) return result;

      if (dataRequest) {
        const loaderData = await loadRouteData(c, route, params, context);
        return dataResponseFromActionResult(result, loaderData);
      }

      return await renderRoute(c, route, params, options, statusForActionResult(result), undefined, result);
    } catch (error) {
      if (isOtokHttpError(error) && error.headers.has("location")) {
        const location = error.headers.get("location")!;
        if (dataRequest) return dataResponseFromRedirect(location, error.status);
        return new Response(null, { status: error.status, headers: error.headers });
      }
      if (isOtokHttpError(error) && error.failure && error.status !== 404) {
        if (dataRequest) return dataResponseFromError(error.failure);
        return await renderRoute(c, route, params, options, error.status, undefined, error.failure);
      }
      throw error;
    }
  });
}

async function loadRouteData(
  c: Context,
  route: OtokRoute,
  params: Record<string, string>,
  context: OtokContext,
): Promise<LoaderResult> {
  if (!route.module.loader) return {};
  const data = await route.module.loader(context);
  return data instanceof Response ? {} : data;
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

    const startedAt = performance.now();
    let downstream: Response | undefined;
    const result = await middleware(c, async () => {
      downstream = await dispatch(position + 1);
    });
    const durationMs = performance.now() - startedAt;
    if (activeDevtoolsTrace) {
      activeDevtoolsTrace.middlewareMs += durationMs;
      otokDevtoolsRecordMiddleware({ route: route.path, index: position, durationMs });
    }

    if (result instanceof Response) return result;
    if (downstream) return downstream;
    return c.res;
  };

  return dispatch(0);
}

async function finalizeDevtoolsRequest(
  trace: ActiveDevtoolsTrace | null,
  hono: Context,
  response: Response,
  routeModule: OtokRoute["module"] | undefined,
): Promise<void> {
  if (!trace) return;

  const redirect = response.headers.get("location") ?? undefined;
  let html = "";
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    html = await response.clone().text();
  }

  const islands = html ? extractIslandIdsFromHtml(html) : [];
  const user = (hono as Context<{ Variables: { user?: { id?: string; roles?: string[] } } }>).get("user");
  otokDevtoolsFinishRequest({
    id: trace.requestId,
    route: trace.route,
    status: response.status,
    renderMode: detectRenderMode({ client: routeModule?.client === true, islands }),
    islands,
    redirect: redirect ?? undefined,
    locale: html ? detectLocaleFromHtml(html) : undefined,
    auth: sanitizeAuthSnapshot({ user }),
    timings: {
      middlewareMs: trace.middlewareMs,
      loaderMs: trace.loaderMs,
      renderMs: trace.renderMs,
      totalMs: performance.now() - trace.requestStartedAt,
    },
  });
}

async function renderRoute(
  c: Context,
  route: OtokRoute,
  params: Record<string, string>,
  options: RenderHandlerOptions,
  status = 200,
  dataOverride?: LoaderResult,
  actionData?: ActionResult,
): Promise<Response> {
  const renderContext = buildRenderContext(c, params, route.path);
  const { plan, warnings } = resolveRouteRendering(route, renderContext, {
    globalStreaming: options.streaming,
    adapterCapabilities: options.adapterCapabilities,
    defaultRendering: options.rendering,
  });
  logRenderingWarnings(warnings);

  if (plan.mode === "client") {
    options = { ...options, streaming: false };
  }

  if (
    plan.cache &&
    renderContext.method === "GET" &&
    dataOverride === undefined &&
    actionData === undefined
  ) {
    const cached = await readCachedHtml(plan.cache, renderContext);
    if (cached) {
      return new Response(cached.html, {
        status,
        headers: {
          ...Object.fromEntries(cached.headers.entries()),
          "content-type": "text/html; charset=utf-8",
        },
      });
    }
  }
  const context: OtokContext = {
    hono: c,
    request: c.req.raw,
    params,
    route: route.path,
    signal: c.req.raw.signal,
  };
  let data: LoaderResult;
  let rawLoaderData: LoaderResult | undefined;
  if (dataOverride !== undefined) {
    data = dataOverride;
  } else if (route.module.loader) {
    const loaderStartedAt = performance.now();
    // Await only the top-level loader; nested createDeferredSlot promises keep running.
    rawLoaderData = await route.module.loader(context);
    data = rawLoaderData;
    const loaderDuration = performance.now() - loaderStartedAt;
    if (activeDevtoolsTrace) {
      activeDevtoolsTrace.loaderMs += loaderDuration;
      otokDevtoolsRecordLoader({
        route: route.path,
        kind: actionData !== undefined ? "action" : "loader",
        durationMs: loaderDuration,
        status,
        validation: typeof data === "object" && data !== null && "fieldErrors" in data,
      });
    }
  } else {
    data = {};
  }
  if (data instanceof Response) return data;

  const slotsPresent = rawLoaderData !== undefined && hasDeferredSlots(rawLoaderData);
  const deferredEnabled = (plan.deferred || slotsPresent) && plan.mode === "ssr";

  if (wantsDataResponse(c.req.raw)) {
    let resolvedData = data;
    if (deferredEnabled && slotsPresent && rawLoaderData !== undefined) {
      resolvedData = (await resolveDeferredData(rawLoaderData, c.req.raw.signal)) as LoaderResult;
    }
    if (actionData !== undefined) {
      return dataResponseFromActionResult(actionData, resolvedData);
    }
    return buildDataResponse({ loaderData: serializeLoaderData(resolvedData) });
  }

  const progressiveDeferred = deferredEnabled && plan.streaming && slotsPresent;

  // head/chrome only see immediate placeholders — never await deferred slots.
  let headData: LoaderResult = data;
  if (deferredEnabled && slotsPresent && !progressiveDeferred) {
    // streaming:false — resolve all slots in parallel before render (no progressive TTFB).
    data = (await resolveDeferredData(rawLoaderData, c.req.raw.signal)) as LoaderResult;
    headData = data;
  } else if (progressiveDeferred) {
    headData = unwrapImmediateData(rawLoaderData) as LoaderResult;
    // Keep DeferredRenderResult objects in `data` so DeferredBoundary can register markers.
    data = rawLoaderData as LoaderResult;
  }

  const head = await resolveHead(route, headData, params);
  const chrome = await resolveChrome(route, headData, params);
  const Page = route.module.default;
  const props = { data, loaderData: data, actionData, params, route: route.path, chrome };
  const islandContext = { islands: new Set<string>(), nextIslandId: 0 };
  const deferredContext: DeferredRenderContext = { boundaries: [] };
  const themeEnabled = options.theme ?? false;
  const htmlOptions = {
    head,
    manifest: options.manifest,
    clientEntry: options.clientEntry,
    devClientEntry: options.devClientEntry,
    devStylesheets: options.devStylesheets,
    base: options.base,
    client: route.module.client === true || plan.mode === "client",
    theme: themeEnabled,
    darkMode: themeEnabled ? resolveDarkModeFromCookie(c.req.header("cookie")) : false,
  };

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

  const renderStartedAt = performance.now();
  const body = withIslandRenderContext(islandContext, () =>
    withDeferredRenderContext(deferredContext, () => renderToString(tree)),
  );
  if (activeDevtoolsTrace) {
    activeDevtoolsTrace.renderMs += performance.now() - renderStartedAt;
  }

  const responseHeaders = new Headers({
    "content-type": "text/html; charset=utf-8",
  });
  if (plan.cache) applyCacheHeaders(responseHeaders, plan.cache, status);
  else if (status >= 400) responseHeaders.set("cache-control", "no-store");

  if (progressiveDeferred && deferredContext.boundaries.length > 0) {
    const boundaryIds = deferredContext.boundaries.map((boundary) => boundary.id);
    const { segments } = splitHtmlAtDeferredMarkers(body, boundaryIds);
    const signal = c.req.raw.signal;
    const stream = composeDeferredHtmlStream({
      ...htmlOptions,
      segments,
      slots: deferredContext.boundaries.map((boundary) => ({
        id: boundary.id,
        promise: boundary.promise,
        render: (value) =>
          withIslandRenderContext(islandContext, () =>
            renderToString(h(Fragment, null, boundary.render(value)) as VNode),
          ),
      })),
      getIslands: () => [...islandContext.islands],
      signal,
    });
    return new Response(stream, { status, headers: responseHeaders });
  }

  // Deferred slots without DeferredBoundary markers: resolve before responding.
  if (progressiveDeferred && deferredContext.boundaries.length === 0 && rawLoaderData !== undefined) {
    data = (await resolveDeferredData(rawLoaderData, c.req.raw.signal)) as LoaderResult;
    const resolvedProps = { ...props, data, loaderData: data };
    let resolvedTree: VNode<any> = h(
      "div",
      { [OTOK_PAGE_ATTR]: "" },
      h(Page as ComponentType<typeof resolvedProps>, resolvedProps),
    );
    for (const layout of [...(route.layouts ?? [])].reverse()) {
      resolvedTree = h(layout.default as ComponentType<typeof resolvedProps & { children: VNode<any> }>, {
        ...resolvedProps,
        children: resolvedTree,
      });
    }
    const resolvedBody = withIslandRenderContext(islandContext, () => renderToString(resolvedTree));
    if (plan.streaming) {
      const encoder = new TextEncoder();
      const signal = c.req.raw.signal;
      const stream = composeHtmlStream({
        ...htmlOptions,
        bodyStream: new ReadableStream({
          start(controller) {
            if (signal.aborted) {
              controller.error(new DOMException("Aborted", "AbortError"));
              return;
            }
            controller.enqueue(encoder.encode(resolvedBody));
            controller.close();
          },
          cancel() {},
        }),
        getIslands: () => [...islandContext.islands],
      });
      return new Response(stream, { status, headers: responseHeaders });
    }
    const html = pageHtml({
      ...htmlOptions,
      body: resolvedBody,
      islands: [...islandContext.islands],
    });
    const transformed =
      options.transformHtml != null
        ? await options.transformHtml(html, { pathname: c.req.path, routeId: route.id })
        : html;
    return new Response(transformed, { status, headers: responseHeaders });
  }

  if (plan.streaming) {
    const encoder = new TextEncoder();
    const signal = c.req.raw.signal;
    const stream = composeHtmlStream({
      ...htmlOptions,
      bodyStream: new ReadableStream({
        start(controller) {
          if (signal.aborted) {
            controller.error(new DOMException("Aborted", "AbortError"));
            return;
          }
          controller.enqueue(encoder.encode(body));
          controller.close();
        },
        cancel() {
          // Client disconnected — stop work early on future progressive renders.
        },
      }),
      getIslands: () => [...islandContext.islands],
    });
    return new Response(stream, { status, headers: responseHeaders });
  }

  const html = pageHtml({
    ...htmlOptions,
    body,
    islands: [...islandContext.islands],
  });

  const transformed =
    options.transformHtml != null
      ? await options.transformHtml(html, { pathname: c.req.path, routeId: route.id })
      : html;

  if (plan.cache && renderContext.method === "GET") {
    await writeCachedHtml(plan.cache, renderContext, transformed);
  }

  return new Response(transformed, {
    status,
    headers: responseHeaders,
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
    const serveStatic = loadServeStatic();
    app.use(`${assetsPath}/*`, async (c, next) => {
      await next();
      if (c.res.status < 400 && !c.res.headers.has("cache-control")) c.header("cache-control", cacheControl);
    });
    app.use(`${assetsPath}/*`, serveStatic({ root: options.staticDir }));
  }

  app.all("*", createOtokHandler(options));
  return app;
}

function loadServeStatic() {
  try {
    // Lazy Node builtin access — avoids a static `node:module` import so Edge
    // bundles (createOtokWorkerApp) stay free of Node-only top-level deps.
    const nodeModule = (
      globalThis as typeof globalThis & {
        process?: { getBuiltinModule?: (id: string) => unknown };
      }
    ).process?.getBuiltinModule?.("module") as typeof import("node:module") | undefined;
    if (!nodeModule?.createRequire) {
      throw new Error("node:module createRequire unavailable");
    }
    const require = nodeModule.createRequire(import.meta.url);
    return require("@hono/node-server/serve-static").serveStatic as (typeof import("@hono/node-server/serve-static"))["serveStatic"];
  } catch {
    throw new Error(
      "otok: createOtokApp({ staticDir }) requires optional peer dependency @hono/node-server. Omit staticDir on Edge runtimes or serve assets from a CDN.",
    );
  }
}

/** Edge-safe app factory without Node static file serving. Serve assets from Workers Assets/CDN/KV/R2 and pass an imported Vite manifest via `resolveOtokManifest()`. */
export function createOtokWorkerApp(
  options: Omit<CreateOtokAppOptions, "staticDir" | "assetsPath" | "assetCacheControl">,
): Hono {
  return createOtokApp({
    ...options,
    staticDir: undefined,
  });
}

export { pageHtml, composeHtmlStream, composeDeferredHtmlStream, type ViteManifest, type ViteManifestEntry } from "./html.js";
export {
  applyCacheHeaders,
  buildRenderContext,
  resolveRouteRendering,
} from "./rendering.js";
export {
  revalidatePath,
  revalidateTag,
  setCacheProvider,
  getCacheProvider,
  buildCacheControlHeader,
} from "../cache/index.js";
export { defineRendering } from "../rendering/define.js";
export type { RenderingConfig, RenderPlan, RenderMode } from "../rendering/types.js";
export {
  resolveOtokManifest,
  type ResolveOtokManifestOptions,
} from "./manifest.js";
export {
  readOtokManifest,
  type ReadOtokManifestOptions,
} from "./manifest-node.js";
export { matchRoute, type RouteMatch } from "./router.js";
export {
  defineMiddleware,
  fail,
  isOtokHttpError,
  isOtokResponse,
  json,
  notFound,
  OtokHttpError,
  redirect,
  validationError,
} from "../shared/routes.js";
export type {
  ActionResult,
  InferLoaderData,
  LayoutModule,
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
  ValidationErrorInput,
} from "../shared/routes.js";
