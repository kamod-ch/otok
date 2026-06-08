import type { Context, Handler } from "hono";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { pageHtml, type ViteManifest } from "./html.js";
import { withIslandRenderContext } from "./island-context.js";
import { matchRoute } from "./router.js";
import type { LoaderResult, OtokHead, OtokRoute } from "../shared/routes.js";

export interface CreateOtokHandlerOptions {
  routes: OtokRoute[];
  manifest?: ViteManifest;
  clientEntry?: string;
  devClientEntry?: string;
  base?: string;
  notFound?: OtokRoute;
}

async function resolveHead(route: OtokRoute, data: LoaderResult, params: Record<string, string>): Promise<OtokHead> {
  if (!route.module.head) return { title: "Otok App" };
  return await route.module.head({
    data,
    params,
    route: route.path,
  });
}

export function createOtokHandler(options: CreateOtokHandlerOptions): Handler {
  return async (c: Context) => {
    const url = new URL(c.req.url);
    const match = matchRoute(options.routes, url.pathname);

    if (!match) {
      if (!options.notFound) return c.notFound();
      return renderRoute(c, options.notFound, {}, options, 404);
    }

    return renderRoute(c, match.route, match.params, options);
  };
}

async function renderRoute(
  c: Context,
  route: OtokRoute,
  params: Record<string, string>,
  options: CreateOtokHandlerOptions,
  status = 200,
): Promise<Response> {
  const context = {
    hono: c,
    request: c.req.raw,
    params,
    route: route.path,
  };
  const data = route.module.loader ? await route.module.loader(context) : {};
  const head = await resolveHead(route, data, params);
  const Page = route.module.default;
  const islandContext = { islands: new Set<string>() };
  const body = withIslandRenderContext(islandContext, () =>
    renderToString(h(Page, { data, params, route: route.path })),
  );
  const html = pageHtml({
    body,
    head,
    islands: [...islandContext.islands],
    manifest: options.manifest,
    clientEntry: options.clientEntry,
    devClientEntry: options.devClientEntry,
    base: options.base,
  });

  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export { pageHtml, type ViteManifest, type ViteManifestEntry } from "./html.js";
export { matchRoute, type RouteMatch } from "./router.js";
export type {
  InferLoaderData,
  LoaderResult,
  OtokContext,
  OtokHead,
  OtokLoader,
  OtokPageProps,
  OtokRoute,
  RouteModule,
  RouteParams,
} from "../shared/routes.js";
