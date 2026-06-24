import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { Fragment, h } from "preact";
import { encodeIslandPropsForHtml, resolveIslandId, } from "../shared/islands.js";
import { registerRenderedIsland } from "../shared/island-context.js";
import { hydrateIslands } from "./hydration.js";
import { prefetchSoftNavUrl, setupSoftNavigation, softNavigate } from "./soft-nav.js";
let islandClientWarningShown = false;
export function Island({ component: Component, props, id, strategy = "load", media, rootMargin, }) {
    if (typeof window !== "undefined") {
        if (!islandClientWarningShown &&
            typeof import.meta !== "undefined" &&
            import.meta.env?.DEV) {
            islandClientWarningShown = true;
            console.warn("otok: <Island> is server-only. It renders nothing in the browser; islands hydrate from SSR markers.");
        }
        return _jsx(Fragment, {});
    }
    const islandId = resolveIslandId(Component, id);
    if (!islandId) {
        throw new Error("otok: Island components need a name, displayName, or explicit id.");
    }
    const instanceId = registerRenderedIsland(islandId);
    const encodedProps = encodeIslandPropsForHtml(props, instanceId);
    const hydrationStrategy = strategy === "client-only" ? "load" : strategy;
    return (_jsxs(Fragment, { children: [_jsx("div", { "data-otok-island": islandId, "data-otok-props": encodedProps.attribute, "data-otok-props-id": encodedProps.propsId, "data-otok-strategy": hydrationStrategy, "data-otok-media": media, "data-otok-root-margin": rootMargin, "data-otok-island-root": "", children: strategy === "client-only" ? null : _jsx(Component, { ...props }) }), encodedProps.scriptJson ? (_jsx("script", { type: "application/json", "data-otok-props-for": encodedProps.propsId, dangerouslySetInnerHTML: { __html: encodedProps.scriptJson } })) : null] }));
}
export function createOtokClient(options = {}) {
    const registry = options.registry ?? window.__OTOK_ISLANDS__;
    if (!registry) {
        throw new Error("otok: createOtokClient() needs an island registry.");
    }
    const root = options.root ?? document;
    void hydrateIslands(root, registry, options.onError);
    if (options.softNav) {
        const softNavOptions = options.softNav === true ? {} : options.softNav;
        setupSoftNavigation(registry, {
            ...softNavOptions,
            onError: (error) => {
                softNavOptions.onError?.(error);
                if (error instanceof Error && error.message.startsWith("otok:")) {
                    options.onError?.(error, document.body);
                }
            },
        });
    }
}
export { cancelPendingHydration, hydrateIslands } from "./hydration.js";
export { isSoftNavLink, prefetchSoftNavUrl, setupSoftNavigation, softNavigate } from "./soft-nav.js";
//# sourceMappingURL=index.js.map