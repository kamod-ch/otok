import { cssEscape } from "../shared/css.js";
import {
  OTOK_CANCEL_HYDRATION,
  OTOK_HEAD_ATTR,
  OTOK_HISTORY_STATE_KEY,
  OTOK_NO_NAV_ATTR,
  OTOK_PAGE_ATTR,
  OTOK_SWAP_ATTR,
} from "../shared/navigation.js";
import type { IslandRegistry } from "../shared/islands.js";
import { cancelPendingHydration, hydrateIslands } from "./hydration.js";

export interface SoftNavOptions {
  /** Enable link interception. Defaults to true for backwards compatibility. */
  links?: boolean;
  /** Enable same-origin form submission enhancement. Defaults to false. */
  forms?: boolean;
  scroll?: boolean | ScrollBehavior;
  prefetch?: boolean;
  onNavigate?: (detail: { url: string }) => void;
  onError?: (error: unknown) => void;
}

export interface SoftNavigateOptions {
  replace?: boolean;
  scroll?: boolean | ScrollBehavior;
}

let activeNavigation: AbortController | null = null;

const prefetchCache = new Map<string, Document>();
const MAX_PREFETCH_CACHE = 10;

function dispatchCancelHydration(root: ParentNode): void {
  cancelPendingHydration(root);
  for (const element of root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")) {
    element.dispatchEvent(new CustomEvent(OTOK_CANCEL_HYDRATION));
  }
}

export function isSoftNavLink(anchor: HTMLAnchorElement, location: Location = window.location): boolean {
  if (anchor.hasAttribute(OTOK_NO_NAV_ATTR)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;

  let url: URL;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return false;
  }

  if (url.origin !== location.origin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.pathname.startsWith("/api/")) return false;

  return true;
}

export function syncSoftNavigationHead(nextDoc: Document, currentDoc: Document = document): void {
  const nextTitle = nextDoc.querySelector("title")?.textContent;
  if (nextTitle) currentDoc.title = nextTitle;

  const managedSelector = `[${OTOK_HEAD_ATTR}]`;
  const nextManaged = [...nextDoc.head.querySelectorAll(managedSelector)];
  const keys = new Set(nextManaged.map((el) => el.getAttribute(OTOK_HEAD_ATTR)).filter(Boolean) as string[]);

  for (const key of keys) {
    const nextEl = nextDoc.head.querySelector(`[${OTOK_HEAD_ATTR}="${cssEscape(key)}"]`);
    const currentEl = currentDoc.head.querySelector(`[${OTOK_HEAD_ATTR}="${cssEscape(key)}"]`);
    if (!nextEl) continue;
    const clone = nextEl.cloneNode(true);
    if (currentEl) currentEl.replaceWith(clone);
    else currentDoc.head.appendChild(clone);
  }

  for (const currentEl of currentDoc.head.querySelectorAll(managedSelector)) {
    const key = currentEl.getAttribute(OTOK_HEAD_ATTR);
    if (key && !keys.has(key)) currentEl.remove();
  }
}

export function applySoftNavigationDocument(nextDoc: Document, currentDoc: Document = document): boolean {
  const nextPage = nextDoc.querySelector(`[${OTOK_PAGE_ATTR}]`);
  const currentPage = currentDoc.querySelector(`[${OTOK_PAGE_ATTR}]`);
  if (!nextPage || !currentPage) return false;

  dispatchCancelHydration(currentDoc);

  for (const nextRegion of nextDoc.querySelectorAll(`[${OTOK_SWAP_ATTR}]`)) {
    const swapId = nextRegion.getAttribute(OTOK_SWAP_ATTR);
    if (!swapId) continue;
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

interface NavigationDocumentResult {
  document: Document;
  url: string;
}

async function fetchNavigationDocument(
  url: string,
  signal: AbortSignal,
): Promise<NavigationDocumentResult | null> {
  const cached = prefetchCache.get(url);
  if (cached) {
    prefetchCache.delete(url);
    return { document: cached, url };
  }

  const response = await fetch(url, {
    signal,
    headers: { Accept: "text/html" },
    credentials: "same-origin",
    redirect: "follow",
  });

  if (!response.ok) return null;

  const finalUrl = response.url;
  if (finalUrl) {
    const final = new URL(finalUrl, window.location.href);
    const requested = new URL(url, window.location.href);
    if (final.origin !== requested.origin) return null;
  }

  const html = await response.text();
  return { document: new DOMParser().parseFromString(html, "text/html"), url: response.url || url };
}

export function prefetchSoftNavUrl(url: string): void {
  if (prefetchCache.has(url)) return;

  void fetch(url, {
    headers: { Accept: "text/html" },
    credentials: "same-origin",
  })
    .then((response) => {
      if (!response.ok) return undefined;
      return response.text();
    })
    .then((html) => {
      if (!html) return;
      if (prefetchCache.size >= MAX_PREFETCH_CACHE) {
        const first = prefetchCache.keys().next().value;
        if (first) prefetchCache.delete(first);
      }
      prefetchCache.set(url, new DOMParser().parseFromString(html, "text/html"));
    })
    .catch(() => undefined);
}

export async function softNavigate(
  url: string,
  registry: IslandRegistry,
  options: SoftNavigateOptions & Pick<SoftNavOptions, "onError"> = {},
): Promise<boolean> {
  activeNavigation?.abort();
  const controller = new AbortController();
  activeNavigation = controller;

  try {
    const result = await fetchNavigationDocument(url, controller.signal);
    if (!result) {
      window.location.assign(url);
      return false;
    }

    const applied = applySoftNavigationDocument(result.document);
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
    } else {
      history.pushState(state, "", historyPath);
    }

    const scrollBehavior = options.scroll ?? true;
    if (scrollBehavior !== false) {
      window.scrollTo({ top: 0, behavior: scrollBehavior === true ? "auto" : scrollBehavior });
    }

    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    options.onError?.(error);
    window.location.assign(url);
    return false;
  } finally {
    if (activeNavigation === controller) activeNavigation = null;
  }
}

export function isSoftNavForm(form: HTMLFormElement, submitter?: HTMLElement, location: Location = window.location): boolean {
  if (form.hasAttribute(OTOK_NO_NAV_ATTR) || submitter?.hasAttribute(OTOK_NO_NAV_ATTR)) return false;
  if (form.target && form.target !== "_self") return false;

  const method = ((submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter.formMethod : "") || form.method || "get").toLowerCase();
  if (method !== "get" && method !== "post") return false;

  const action = (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter.formAction : "") || form.action || location.href;
  let url: URL;
  try {
    url = new URL(action, location.href);
  } catch {
    return false;
  }

  if (url.origin !== location.origin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.pathname.startsWith("/api/")) return false;

  return true;
}

function formDataWithSubmitter(form: HTMLFormElement, submitter?: HTMLElement): FormData {
  try {
    return new FormData(form, submitter instanceof HTMLElement ? submitter : undefined);
  } catch {
    const data = new FormData(form);
    if (
      (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) &&
      submitter.name &&
      !submitter.disabled
    ) {
      data.append(submitter.name, submitter.value);
    }
    return data;
  }
}

async function submitSoftNavigationForm(
  form: HTMLFormElement,
  submitter: HTMLElement | undefined,
  registry: IslandRegistry,
  options: Pick<SoftNavOptions, "onError" | "scroll"> = {},
): Promise<boolean> {
  activeNavigation?.abort();
  const controller = new AbortController();
  activeNavigation = controller;

  const submitControl = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : undefined;
  const method = (submitControl?.formMethod || form.method || "get").toUpperCase();
  const action = submitControl?.formAction || form.action || window.location.href;
  const url = new URL(action, window.location.href);
  const body = formDataWithSubmitter(form, submitter);

  const fetchUrl = new URL(url.href);
  const init: RequestInit = {
    signal: controller.signal,
    headers: { Accept: "text/html" },
    credentials: "same-origin",
    redirect: "follow",
  };

  if (method === "GET") {
    const search = new URLSearchParams();
    for (const [key, value] of body) search.append(key, typeof value === "string" ? value : value.name);
    fetchUrl.search = search.toString();
  } else {
    init.method = "POST";
    init.body = body;
  }

  try {
    const response = await fetch(fetchUrl.href, init);
    if (!response.ok) return false;
    const finalUrl = response.url || fetchUrl.href;
    const final = new URL(finalUrl, window.location.href);
    if (final.origin !== window.location.origin) return false;

    const html = await response.text();
    const nextDoc = new DOMParser().parseFromString(html, "text/html");
    const applied = applySoftNavigationDocument(nextDoc);
    if (!applied) return false;

    await hydrateIslands(document, registry, (error) => options.onError?.(error));

    const historyPath = `${final.pathname}${final.search}${final.hash}`;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (historyPath !== currentPath) {
      history.pushState({ [OTOK_HISTORY_STATE_KEY]: true, url: historyPath }, "", historyPath);
    }

    const invalid = document.querySelector('[aria-invalid="true"], [role="alert"]');
    if (invalid instanceof HTMLElement) invalid.focus?.();

    const scrollBehavior = options.scroll ?? true;
    if (scrollBehavior !== false) {
      window.scrollTo({ top: 0, behavior: scrollBehavior === true ? "auto" : scrollBehavior });
    }

    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    options.onError?.(error);
    return false;
  } finally {
    if (activeNavigation === controller) activeNavigation = null;
  }
}

export function setupSoftNavigation(registry: IslandRegistry, options: SoftNavOptions = {}): () => void {
  const linksEnabled = options.links !== false;
  const formsEnabled = options.forms === true;
  const prefetchEnabled = linksEnabled && options.prefetch !== false;

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!linksEnabled || !isSoftNavLink(anchor)) return;

    event.preventDefault();
    const url = anchor.href;
    void softNavigate(url, registry, {
      onError: options.onError,
      scroll: options.scroll,
    }).then((applied) => {
      if (applied) options.onNavigate?.({ url });
    });
  };

  const onPointerOver = (event: Event) => {
    if (!prefetchEnabled) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isSoftNavLink(anchor)) return;
    prefetchSoftNavUrl(anchor.href);
  };

  const onSubmit = (event: SubmitEvent) => {
    if (!formsEnabled || event.defaultPrevented) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const submitter = event.submitter instanceof HTMLElement ? event.submitter : undefined;
    if (!isSoftNavForm(form, submitter)) return;

    event.preventDefault();
    void submitSoftNavigationForm(form, submitter, registry, {
      onError: options.onError,
      scroll: options.scroll,
    }).then((applied) => {
      if (applied) options.onNavigate?.({ url: form.action || window.location.href });
      else form.submit();
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
  document.addEventListener("mouseover", onPointerOver, true);
  document.addEventListener("submit", onSubmit, true);
  window.addEventListener("popstate", onPopState);

  return () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("mouseover", onPointerOver, true);
    document.removeEventListener("submit", onSubmit, true);
    window.removeEventListener("popstate", onPopState);
    activeNavigation?.abort();
    activeNavigation = null;
    prefetchCache.clear();
  };
}
