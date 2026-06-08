import { jsx as _jsx } from "preact/jsx-runtime";
import { Fragment, h } from "preact";
import { hydrate } from "preact";
import { decodeIslandProps, encodeIslandProps, resolveIslandId, } from "../shared/islands.js";
import { registerRenderedIsland } from "../server/island-context.js";
export function Island({ component: Component, props, id, }) {
    if (typeof window !== "undefined") {
        return _jsx(Fragment, {});
    }
    const islandId = resolveIslandId(Component, id);
    if (!islandId) {
        throw new Error("otok: Island components need a name, displayName, or explicit id.");
    }
    registerRenderedIsland(islandId);
    return (_jsx("div", { "data-otok-island": islandId, "data-otok-props": encodeIslandProps(props), "data-otok-island-root": "", children: _jsx(Component, { ...props }) }));
}
async function hydrateIsland(element, registry, onError) {
    const id = element.getAttribute("data-otok-island");
    if (!id || element.getAttribute("data-otok-hydrated") === "true")
        return;
    const load = registry[id];
    if (!load) {
        const error = new Error(`otok: No island registered for "${id}".`);
        if (onError)
            onError(error, element);
        else
            throw error;
        return;
    }
    try {
        const mod = await load();
        const Component = mod.default ?? mod[id];
        if (typeof Component !== "function") {
            throw new Error(`otok: Island "${id}" does not export a component.`);
        }
        const props = decodeIslandProps(element.getAttribute("data-otok-props"));
        hydrate(h(Component, props), element);
        element.setAttribute("data-otok-hydrated", "true");
    }
    catch (error) {
        if (onError)
            onError(error, element);
        else
            throw error;
    }
}
export function createOtokClient(options = {}) {
    const registry = options.registry ?? window.__OTOK_ISLANDS__;
    if (!registry) {
        throw new Error("otok: createOtokClient() needs an island registry.");
    }
    const root = options.root ?? document;
    const islands = [...root.querySelectorAll("[data-otok-island]")];
    void Promise.all(islands.map((element) => hydrateIsland(element, registry, options.onError)));
}
//# sourceMappingURL=index.js.map