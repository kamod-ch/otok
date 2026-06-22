import { h } from "preact";
import { hydrate } from "preact";
import { decodeIslandProps } from "../shared/islands.js";
export async function hydrateIsland(element, registry, onError) {
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
        const props = decodeIslandPropsFromElement(element);
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
function decodeIslandPropsFromElement(element) {
    const propsId = element.getAttribute("data-otok-props-id");
    if (propsId) {
        const script = element.ownerDocument.querySelector(`script[type="application/json"][data-otok-props-for="${cssEscape(propsId)}"]`);
        if (script?.textContent)
            return JSON.parse(script.textContent);
    }
    return decodeIslandProps(element.getAttribute("data-otok-props"));
}
function cssEscape(value) {
    if (typeof CSS !== "undefined" && CSS.escape)
        return CSS.escape(value);
    return value.replaceAll('"', '\\"').replaceAll("\\", "\\\\");
}
function scheduleIslandHydration(element, registry, onError) {
    const strategy = element.getAttribute("data-otok-strategy") ?? "load";
    if (strategy === "idle")
        return hydrateWhenIdle(element, registry, onError);
    if (strategy === "visible")
        return hydrateWhenVisible(element, registry, onError);
    if (strategy === "media")
        return hydrateWhenMediaMatches(element, registry, onError);
    return hydrateIsland(element, registry, onError);
}
function hydrateWhenIdle(element, registry, onError) {
    return new Promise((resolve) => {
        const run = () => void hydrateIsland(element, registry, onError).then(resolve);
        const idle = window.requestIdleCallback;
        if (idle) {
            idle(run);
        }
        else {
            globalThis.setTimeout(run, 1);
        }
    });
}
function hydrateWhenVisible(element, registry, onError) {
    if (!("IntersectionObserver" in window))
        return hydrateIsland(element, registry, onError);
    return new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting))
                return;
            observer.disconnect();
            void hydrateIsland(element, registry, onError).then(resolve);
        }, { rootMargin: element.getAttribute("data-otok-root-margin") ?? "0px" });
        observer.observe(element);
    });
}
function hydrateWhenMediaMatches(element, registry, onError) {
    const media = element.getAttribute("data-otok-media");
    if (!media || !("matchMedia" in window))
        return hydrateIsland(element, registry, onError);
    const query = window.matchMedia(media);
    if (query.matches)
        return hydrateIsland(element, registry, onError);
    return new Promise((resolve) => {
        const onChange = () => {
            if (!query.matches)
                return;
            query.removeEventListener("change", onChange);
            void hydrateIsland(element, registry, onError).then(resolve);
        };
        query.addEventListener("change", onChange);
    });
}
export function hydrateIslands(root, registry, onError) {
    const islands = [...root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")];
    return Promise.all(islands.map((element) => scheduleIslandHydration(element, registry, onError)));
}
//# sourceMappingURL=hydration.js.map