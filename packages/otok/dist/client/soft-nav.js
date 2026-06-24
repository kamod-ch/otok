import { cssEscape } from "../shared/css.js";
import { OTOK_CANCEL_HYDRATION, OTOK_HEAD_ATTR, OTOK_HISTORY_STATE_KEY, OTOK_NO_NAV_ATTR, OTOK_PAGE_ATTR, OTOK_SWAP_ATTR, } from "../shared/navigation.js";
import { cancelPendingHydration, hydrateIslands } from "./hydration.js";
let activeNavigation = null;
const prefetchCache = new Map();
const MAX_PREFETCH_CACHE = 10;
function dispatchCancelHydration(root) {
    cancelPendingHydration(root);
    for (const element of root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")) {
        element.dispatchEvent(new CustomEvent(OTOK_CANCEL_HYDRATION));
    }
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
export function syncSoftNavigationHead(nextDoc, currentDoc = document) {
    const nextTitle = nextDoc.querySelector("title")?.textContent;
    if (nextTitle)
        currentDoc.title = nextTitle;
    const managedSelector = `[${OTOK_HEAD_ATTR}]`;
    const nextManaged = [...nextDoc.head.querySelectorAll(managedSelector)];
    const keys = new Set(nextManaged.map((el) => el.getAttribute(OTOK_HEAD_ATTR)).filter(Boolean));
    for (const key of keys) {
        const nextEl = nextDoc.head.querySelector(`[${OTOK_HEAD_ATTR}="${cssEscape(key)}"]`);
        const currentEl = currentDoc.head.querySelector(`[${OTOK_HEAD_ATTR}="${cssEscape(key)}"]`);
        if (!nextEl)
            continue;
        const clone = nextEl.cloneNode(true);
        if (currentEl)
            currentEl.replaceWith(clone);
        else
            currentDoc.head.appendChild(clone);
    }
    for (const currentEl of currentDoc.head.querySelectorAll(managedSelector)) {
        const key = currentEl.getAttribute(OTOK_HEAD_ATTR);
        if (key && !keys.has(key))
            currentEl.remove();
    }
}
export function applySoftNavigationDocument(nextDoc, currentDoc = document) {
    const nextPage = nextDoc.querySelector(`[${OTOK_PAGE_ATTR}]`);
    const currentPage = currentDoc.querySelector(`[${OTOK_PAGE_ATTR}]`);
    if (!nextPage || !currentPage)
        return false;
    dispatchCancelHydration(currentDoc);
    for (const nextRegion of nextDoc.querySelectorAll(`[${OTOK_SWAP_ATTR}]`)) {
        const swapId = nextRegion.getAttribute(OTOK_SWAP_ATTR);
        if (!swapId)
            continue;
        const currentRegion = currentDoc.querySelector(`[${OTOK_SWAP_ATTR}="${cssEscape(swapId)}"]`);
        if (currentRegion) {
            dispatchCancelHydration(currentRegion);
            currentRegion.outerHTML = nextRegion.outerHTML;
        }
    }
    dispatchCancelHydration(currentPage);
    currentPage.outerHTML = nextPage.outerHTML;
    syncSoftNavigationHead(nextDoc, currentDoc);
    return true;
}
async function fetchNavigationDocument(url, signal) {
    const cached = prefetchCache.get(url);
    if (cached) {
        prefetchCache.delete(url);
        return cached;
    }
    const response = await fetch(url, {
        signal,
        headers: { Accept: "text/html" },
        credentials: "same-origin",
        redirect: "follow",
    });
    if (!response.ok)
        return null;
    const finalUrl = response.url;
    if (finalUrl) {
        const final = new URL(finalUrl, window.location.href);
        const requested = new URL(url, window.location.href);
        if (final.origin !== requested.origin)
            return null;
    }
    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
}
export function prefetchSoftNavUrl(url) {
    if (prefetchCache.has(url))
        return;
    void fetch(url, {
        headers: { Accept: "text/html" },
        credentials: "same-origin",
    })
        .then((response) => {
        if (!response.ok)
            return undefined;
        return response.text();
    })
        .then((html) => {
        if (!html)
            return;
        if (prefetchCache.size >= MAX_PREFETCH_CACHE) {
            const first = prefetchCache.keys().next().value;
            if (first)
                prefetchCache.delete(first);
        }
        prefetchCache.set(url, new DOMParser().parseFromString(html, "text/html"));
    })
        .catch(() => undefined);
}
export async function softNavigate(url, registry, options = {}) {
    activeNavigation?.abort();
    const controller = new AbortController();
    activeNavigation = controller;
    try {
        const nextDoc = await fetchNavigationDocument(url, controller.signal);
        if (!nextDoc) {
            window.location.assign(url);
            return false;
        }
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
    const prefetchEnabled = options.prefetch !== false;
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
    const onPointerOver = (event) => {
        if (!prefetchEnabled)
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement))
            return;
        if (!isSoftNavLink(anchor))
            return;
        prefetchSoftNavUrl(anchor.href);
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
    document.addEventListener("mouseover", onPointerOver, true);
    window.addEventListener("popstate", onPopState);
    return () => {
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("mouseover", onPointerOver, true);
        window.removeEventListener("popstate", onPopState);
        activeNavigation?.abort();
        activeNavigation = null;
        prefetchCache.clear();
    };
}
//# sourceMappingURL=soft-nav.js.map