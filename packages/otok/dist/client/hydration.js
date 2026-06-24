import { h } from "preact";
import { hydrate } from "preact";
import { cssEscape } from "../shared/css.js";
import { OTOK_CANCEL_HYDRATION } from "../shared/navigation.js";
import { decodeIslandProps } from "../shared/islands.js";
const pendingHydrations = new WeakMap();
export function cancelPendingHydration(root) {
    for (const element of root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")) {
        pendingHydrations.get(element)?.abort();
        pendingHydrations.delete(element);
    }
}
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
        pendingHydrations.delete(element);
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
function trackPending(element, abort) {
    pendingHydrations.get(element)?.abort();
    pendingHydrations.set(element, { abort });
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
        let cancelled = false;
        const idleId = { value: 0 };
        const timeoutId = { value: undefined };
        const cleanup = () => {
            cancelled = true;
            pendingHydrations.delete(element);
        };
        trackPending(element, cleanup);
        const run = () => {
            if (cancelled)
                return resolve();
            void hydrateIsland(element, registry, onError).then(resolve);
        };
        const idle = window.requestIdleCallback;
        if (idle) {
            idleId.value = idle(run);
        }
        else {
            timeoutId.value = globalThis.setTimeout(run, 1);
        }
        element.addEventListener(OTOK_CANCEL_HYDRATION, () => {
            cleanup();
            resolve();
        }, { once: true });
    });
}
function hydrateWhenVisible(element, registry, onError) {
    if (!("IntersectionObserver" in window))
        return hydrateIsland(element, registry, onError);
    return new Promise((resolve) => {
        let cancelled = false;
        const observer = new IntersectionObserver((entries) => {
            if (cancelled || !entries.some((entry) => entry.isIntersecting))
                return;
            observer.disconnect();
            pendingHydrations.delete(element);
            void hydrateIsland(element, registry, onError).then(resolve);
        }, { rootMargin: element.getAttribute("data-otok-root-margin") ?? "0px" });
        trackPending(element, () => {
            cancelled = true;
            observer.disconnect();
        });
        observer.observe(element);
        element.addEventListener(OTOK_CANCEL_HYDRATION, () => {
            cancelled = true;
            observer.disconnect();
            pendingHydrations.delete(element);
            resolve();
        }, { once: true });
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
        let cancelled = false;
        const onChange = () => {
            if (cancelled || !query.matches)
                return;
            query.removeEventListener("change", onChange);
            pendingHydrations.delete(element);
            void hydrateIsland(element, registry, onError).then(resolve);
        };
        trackPending(element, () => {
            cancelled = true;
            query.removeEventListener("change", onChange);
        });
        query.addEventListener("change", onChange);
        element.addEventListener(OTOK_CANCEL_HYDRATION, () => {
            cancelled = true;
            query.removeEventListener("change", onChange);
            pendingHydrations.delete(element);
            resolve();
        }, { once: true });
    });
}
export function hydrateIslands(root, registry, onError) {
    const islands = [...root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")];
    return Promise.all(islands.map((element) => scheduleIslandHydration(element, registry, onError)));
}
//# sourceMappingURL=hydration.js.map