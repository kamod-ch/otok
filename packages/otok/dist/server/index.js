import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { pageHtml } from "./html.js";
import { matchRoute } from "./router.js";
import { withIslandRenderContext } from "../shared/island-context.js";
import { isOtokHttpError, json, } from "../shared/routes.js";
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
            if (isActionRequest(c.req.method)) {
                return await handleAction(c, match.route, match.params, options);
            }
            return await renderRoute(c, match.route, match.params, options);
        }
        catch (error) {
            return handleRenderError(c, error, options);
        }
    };
}
function isActionRequest(method) {
    const normalized = method.toUpperCase();
    return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}
function resolveActionMethod(method, formData) {
    const override = formData?.get("_method");
    const candidate = typeof override === "string" ? override.toUpperCase() : method.toUpperCase();
    if (candidate === "PUT" || candidate === "PATCH" || candidate === "DELETE")
        return candidate;
    return "POST";
}
function isFormRequest(request) {
    const contentType = request.headers.get("content-type") ?? "";
    return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}
async function resolveActionFormData(request) {
    if (!isFormRequest(request))
        return undefined;
    return await request.clone().formData();
}
async function handleAction(c, route, params, options) {
    if (!route.module.action) {
        return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const formData = await resolveActionFormData(c.req.raw);
    const context = {
        hono: c,
        request: c.req.raw,
        params,
        route: route.path,
        method: resolveActionMethod(c.req.method, formData),
        formData,
    };
    try {
        const result = await route.module.action(context);
        if (result instanceof Response)
            return result;
        return await renderRoute(c, route, params, options, statusForActionResult(result), undefined, result);
    }
    catch (error) {
        if (isOtokHttpError(error) && error.headers.has("location")) {
            return new Response(null, { status: error.status, headers: error.headers });
        }
        if (isOtokHttpError(error) && error.failure && error.status !== 404) {
            return await renderRoute(c, route, params, options, error.status, undefined, error.failure);
        }
        throw error;
    }
}
function statusForActionResult(result) {
    return typeof result === "object" && result !== null && "status" in result && typeof result.status === "number"
        ? result.status
        : 200;
}
async function renderRoute(c, route, params, options, status = 200, dataOverride, actionData) {
    const context = {
        hono: c,
        request: c.req.raw,
        params,
        route: route.path,
    };
    const data = dataOverride ?? (route.module.loader ? await route.module.loader(context) : {});
    if (data instanceof Response)
        return data;
    const head = await resolveHead(route, data, params);
    const chrome = await resolveChrome(route, data, params);
    const Page = route.module.default;
    const props = { data, actionData, params, route: route.path, chrome };
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
            return renderFallbackRoute(c, options.errorRoute, options, error.status, error.failure ?? {
                message: error.message,
                status: error.status,
            });
        }
        if (error.failure)
            return json(error.failure, { status: error.status, headers: error.headers });
        return new Response(error.message, { status: error.status, headers: error.headers });
    }
    if (options.errorRoute) {
        const message = options.exposeErrorDetails === true && error instanceof Error ? error.message : "Internal server error";
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
    app.all("*", createOtokHandler(options));
    return app;
}
export { pageHtml } from "./html.js";
export { readOtokManifest } from "./manifest.js";
export { matchRoute } from "./router.js";
export { fail, isOtokHttpError, isOtokResponse, json, notFound, OtokHttpError, redirect } from "../shared/routes.js";
//# sourceMappingURL=index.js.map