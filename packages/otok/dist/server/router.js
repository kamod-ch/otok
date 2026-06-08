export function matchRoute(routes, pathname) {
    for (const route of routes) {
        const match = route.pattern.exec(pathname);
        if (!match)
            continue;
        const params = {};
        route.params.forEach((name, index) => {
            params[name] = decodeURIComponent(match[index + 1] ?? "");
        });
        return { route, params };
    }
    return undefined;
}
//# sourceMappingURL=router.js.map