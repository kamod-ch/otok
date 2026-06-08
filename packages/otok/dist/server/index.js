import { h } from "preact";
import renderToString from "preact-render-to-string";
import { pageHtml } from "./html.js";
import { withIslandRenderContext } from "./island-context.js";
import { matchRoute } from "./router.js";
async function resolveHead(route, data, params) {
    if (!route.module.head)
        return { title: "Otok App" };
    return await route.module.head({
        data,
        params,
        route: route.path,
    });
}
export function createOtokHandler(options) {
    return async (c) => {
        const url = new URL(c.req.url);
        const match = matchRoute(options.routes, url.pathname);
        if (!match) {
            if (!options.notFound)
                return c.notFound();
            return renderRoute(c, options.notFound, {}, options, 404);
        }
        return renderRoute(c, match.route, match.params, options);
    };
}
async function renderRoute(c, route, params, options, status = 200) {
    const context = {
        hono: c,
        request: c.req.raw,
        params,
        route: route.path,
    };
    const data = route.module.loader ? await route.module.loader(context) : {};
    const head = await resolveHead(route, data, params);
    const Page = route.module.default;
    const islandContext = { islands: new Set() };
    const body = withIslandRenderContext(islandContext, () => renderToString(h(Page, { data, params, route: route.path })));
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
export { pageHtml } from "./html.js";
export { matchRoute } from "./router.js";
//# sourceMappingURL=index.js.map