import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { pageHtml } from "./html.js";
import { matchRoute } from "./router.js";
import { withIslandRenderContext } from "../shared/island-context.js";
import { isOtokHttpError, } from "../shared/routes.js";
import { OTOK_PAGE_ATTR } from "../shared/navigation.js";
import { resolveDarkModeFromCookie } from "../shared/theme.js";
async function resolveHead(route, data, params) {
    if (!route.module.head)
        return { title: "Otok App" };
    return await route.module.head({
        data,
        params,
        route: route.path,
    });
}
async function resolveChrome(route, data, params) {
    if (!route.module.chrome)
        return undefined;
    return await route.module.chrome({
        data,
        params,
        route: route.path,
    });
}
export function createOtokHandler(options) {
    return async (c) => {
        const url = new URL(c.req.url);
        const match = matchRoute(options.routes, url.pathname);
        try {
            if (!match) {
                const notFoundRoute = options.notFoundRoute ?? options.notFound;
                if (!notFoundRoute)
                    return c.notFound();
                return await renderRoute(c, notFoundRoute, {}, options, 404);
            }
            return await renderRoute(c, match.route, match.params, options);
        }
        catch (error) {
            return handleRenderError(c, error, options);
        }
    };
}
async function renderRoute(c, route, params, options, status = 200, dataOverride) {
    const context = {
        hono: c,
        request: c.req.raw,
        params,
        route: route.path,
    };
    const data = dataOverride ?? (route.module.loader ? await route.module.loader(context) : {});
    const head = await resolveHead(route, data, params);
    const chrome = await resolveChrome(route, data, params);
    const Page = route.module.default;
    const props = { data, params, route: route.path, chrome };
    const islandContext = { islands: new Set(), nextIslandId: 0 };
    const body = withIslandRenderContext(islandContext, () => {
        let tree = h("div", { [OTOK_PAGE_ATTR]: "" }, h(Page, props));
        for (const layout of [...(route.layouts ?? [])].reverse()) {
            tree = h(layout.default, {
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
        base: options.base,
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
async function handleRenderError(c, error, options) {
    if (isOtokHttpError(error)) {
        const location = error.headers.get("location");
        if (location) {
            return new Response(null, { status: error.status, headers: error.headers });
        }
        if (error.status === 404) {
            const notFoundRoute = options.notFoundRoute ?? options.notFound;
            if (notFoundRoute)
                return renderFallbackRoute(c, notFoundRoute, options, 404, { message: error.message });
        }
        if (options.errorRoute) {
            return renderFallbackRoute(c, options.errorRoute, options, error.status, {
                message: error.message,
                status: error.status,
            });
        }
        return new Response(error.message, { status: error.status, headers: error.headers });
    }
    if (options.errorRoute) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return renderFallbackRoute(c, options.errorRoute, options, 500, { message, status: 500 });
    }
    throw error;
}
async function renderFallbackRoute(c, route, options, status, data) {
    try {
        return await renderRoute(c, route, {}, options, status, data);
    }
    catch {
        return new Response(status === 404 ? "Not found" : "Internal server error", { status });
    }
}
export function createOtokApp(options) {
    const app = new Hono();
    options.configure?.(app);
    if (options.health) {
        const payload = typeof options.health === "object" ? options.health : { ok: true, framework: "otok" };
        app.get("/api/health", (c) => c.json(payload));
    }
    if (options.staticDir) {
        app.use(`${options.assetsPath ?? "/assets"}/*`, serveStatic({ root: options.staticDir }));
    }
    app.get("*", createOtokHandler(options));
    return app;
}
export { pageHtml } from "./html.js";
export { readOtokManifest } from "./manifest.js";
export { matchRoute } from "./router.js";
export { fail, isOtokHttpError, notFound, OtokHttpError, redirect } from "../shared/routes.js";
//# sourceMappingURL=index.js.map