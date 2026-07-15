import { h } from "preact";
import { createOtokApp, } from "otok/server";
const DefaultPage = ({ route }) => h("p", null, `Otok test route: ${route}`);
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function routePathToPattern(path) {
    const params = [];
    const segments = path.split("/").filter(Boolean);
    const patternParts = segments.map((segment) => {
        const dynamic = /^:([A-Za-z_$][\w$]*)(\*)?$/.exec(segment);
        if (!dynamic)
            return escapeRegex(segment);
        params.push(dynamic[1]);
        return dynamic[2] ? "(.+)" : "([^/]+)";
    });
    const source = patternParts.length > 0 ? `^/${patternParts.join("/")}/?$` : "^/?$";
    return { pattern: new RegExp(source), params };
}
export function createTestRoute(input) {
    const inferred = routePathToPattern(input.path);
    const component = input.component ?? input.module?.default ?? DefaultPage;
    return {
        id: input.id ?? input.path,
        path: input.path,
        pattern: input.pattern ?? inferred.pattern,
        params: input.params ?? inferred.params,
        module: {
            default: component,
            ...input.module,
            loader: input.loader ?? input.module?.loader,
            action: input.action ?? input.module?.action,
        },
        layouts: input.layouts,
        middleware: input.middleware,
    };
}
function isOtokRoute(route) {
    return route.pattern instanceof RegExp && "params" in route && "module" in route;
}
function normalizeRoute(route) {
    if (!route)
        return undefined;
    return isOtokRoute(route) ? route : createTestRoute(route);
}
export function createTestApp(options) {
    return createOtokApp({
        ...options,
        routes: options.routes.map((route) => normalizeRoute(route)),
        notFoundRoute: normalizeRoute(options.notFoundRoute),
        errorRoute: normalizeRoute(options.errorRoute),
    });
}
export async function requestRoute(appOrOptions, path, init) {
    const app = "request" in appOrOptions ? appOrOptions : createTestApp(appOrOptions);
    return await app.request(path, init);
}
export async function renderRoute(appOrOptions, path, init) {
    const response = await requestRoute(appOrOptions, path, init);
    return { response, html: await response.text() };
}
//# sourceMappingURL=index.js.map