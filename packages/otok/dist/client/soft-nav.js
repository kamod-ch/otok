import { OTOK_HISTORY_STATE_KEY, OTOK_NO_NAV_ATTR, OTOK_PAGE_ATTR, OTOK_SWAP_ATTR, } from "../shared/navigation.js";
import { hydrateIslands } from "./hydration.js";
let activeNavigation = null;
function cssEscape(value) {
    if (typeof CSS !== "undefined" && CSS.escape)
        return CSS.escape(value);
    return value.replaceAll('"', '\\"').replaceAll("\\", "\\\\");
}
export function isSoftNavLink(anchor, location = window.location) {
    if (anchor.hasAttribute(OTOK_NO_NAV_ATTR))
        return false;
    if (anchor.target && anchor.target !== "_self")
        return false;
    if (anchor.hasAttribute("download"))
        return false;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:"))
        return false;
    let url;
    try {
        url = new URL(anchor.href, location.href);
    }
    catch {
        return false;
    }
    if (url.origin !== location.origin)
        return false;
    if (url.protocol !== "http:" && url.protocol !== "https:")
        return false;
    if (url.pathname.startsWith("/api/"))
        return false;
    return true;
}
export function applySoftNavigationDocument(nextDoc, currentDoc = document) {
    const nextPage = nextDoc.querySelector(`[${OTOK_PAGE_ATTR}]`);
    const currentPage = currentDoc.querySelector(`[${OTOK_PAGE_ATTR}]`);
    if (!nextPage || !currentPage)
        return false;
    for (const nextRegion of nextDoc.querySelectorAll(`[${OTOK_SWAP_ATTR}]`)) {
        const swapId = nextRegion.getAttribute(OTOK_SWAP_ATTR);
        if (!swapId)
            continue;
        const currentRegion = currentDoc.querySelector(`[${OTOK_SWAP_ATTR}="${cssEscape(swapId)}"]`);
        if (currentRegion)
            currentRegion.outerHTML = nextRegion.outerHTML;
    }
    currentPage.outerHTML = nextPage.outerHTML;
    const nextTitle = nextDoc.querySelector("title")?.textContent;
    if (nextTitle)
        currentDoc.title = nextTitle;
    return true;
}
export async function softNavigate(url, registry, options = {}) {
    activeNavigation?.abort();
    const controller = new AbortController();
    activeNavigation = controller;
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: "text/html" },
            credentials: "same-origin",
        });
        if (!response.ok) {
            window.location.assign(url);
            return false;
        }
        const html = await response.text();
        const nextDoc = new DOMParser().parseFromString(html, "text/html");
        const applied = applySoftNavigationDocument(nextDoc);
        if (!applied) {
            window.location.assign(url);
            return false;
        }
        await hydrateIslands(document, registry, (error) => options.onError?.(error));
        const historyUrl = new URL(url, window.location.href);
        const historyPath = `${historyUrl.pathname}${historyUrl.search}${historyUrl.hash}`;
        const state = { [OTOK_HISTORY_STATE_KEY]: true, url: historyPath };
        if (options.replace) {
            history.replaceState(state, "", historyPath);
        }
        else {
            history.pushState(state, "", historyPath);
        }
        const scrollBehavior = options.scroll ?? true;
        if (scrollBehavior !== false) {
            window.scrollTo({ top: 0, behavior: scrollBehavior === true ? "auto" : scrollBehavior });
        }
        return true;
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
            return false;
        options.onError?.(error);
        window.location.assign(url);
        return false;
    }
    finally {
        if (activeNavigation === controller)
            activeNavigation = null;
    }
}
export function setupSoftNavigation(registry, options = {}) {
    const onClick = (event) => {
        if (event.defaultPrevented)
            return;
        if (event.button !== 0)
            return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement))
            return;
        if (!isSoftNavLink(anchor))
            return;
        event.preventDefault();
        const url = anchor.href;
        void softNavigate(url, registry, {
            onError: options.onError,
            scroll: options.scroll,
        }).then((applied) => {
            if (applied)
                options.onNavigate?.({ url });
        });
    };
    const onPopState = () => {
        const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        void softNavigate(path, registry, {
            replace: true,
            onError: options.onError,
            scroll: false,
        });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
        document.removeEventListener("click", onClick, true);
        window.removeEventListener("popstate", onPopState);
        activeNavigation?.abort();
        activeNavigation = null;
    };
}
//# sourceMappingURL=soft-nav.js.map