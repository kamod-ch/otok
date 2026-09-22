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
import {
  beginHydrationNavigation,
  cancelPendingHydration,
  hydrateIslandsDeferred,
  hydrateIslandsEager,
  unmountHydratedIslands,
} from "./hydration.js";
import {
  restoreFocus,
  restoreScrollPosition,
  saveScrollPosition,
  scrollToHashFromUrl,
  withViewTransition,
} from "./mutations/scroll.js";
import {
  invalidateSoftNavPrefetch,
  parseSoftNavHtmlResponse,
  prefetchSoftNavUrl,
  takePrefetchedNavigationDocument,
} from "./soft-nav-prefetch.js";

export {
  invalidateSoftNavPrefetch,
  prefetchSoftNavUrl,
  setSoftNavPrefetchScope,
  type SoftNavPrefetchInvalidateOptions,
  type SoftNavPrefetchInvalidateReason,
  type SoftNavPrefetchScope,
} from "./soft-nav-prefetch.js";
import {
  analyzeSoftNavFormSupport,
  buildSoftFormFetchInit,
  clearFormSubmitError,
  defaultSoftFormErrorMessages,
  historyPathFromUrl,
  isValidationHtmlResponse,
  nativeRequestSubmit,
  setFormSubmitting,
  showFormSubmitError,
  softFormSubmitToLegacyBoolean,
  type SoftFormSubmitResult,
} from "./soft-nav-form.js";

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
  history?: boolean;
}

let activeNavigation: AbortController | null = null;
let activeFormSubmissionGeneration = 0;
const inFlightForms = new WeakSet<HTMLFormElement>();

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
      unmountHydratedIslands(currentRegion);
      dispatchCancelHydration(currentRegion);
      currentRegion.outerHTML = nextRegion.outerHTML;
    }
  }

  unmountHydratedIslands(currentPage);
  dispatchCancelHydration(currentPage);
  currentPage.outerHTML = nextPage.outerHTML;
  syncSoftNavigationHead(nextDoc, currentDoc);

  return true;
}

interface NavigationDocumentResult {
  document: Document;
  url: string;
}

async function fetchNavigationDocument(url: string, signal: AbortSignal): Promise<NavigationDocumentResult | null> {
  const prefetched = takePrefetchedNavigationDocument(url);
  if (prefetched) {
    return prefetched;
  }

  const response = await fetch(url, {
    signal,
    headers: { Accept: "text/html" },
    credentials: "same-origin",
    redirect: "follow",
  });

  const html = await response.text();
  return parseSoftNavHtmlResponse(response, url, html);
}

function navigationScrollUrl(requestedUrl: string, finalUrl: string): string {
  const requested = new URL(requestedUrl, window.location.href);
  const final = new URL(finalUrl, window.location.href);
  if (requested.hash && !final.hash) {
    return `${final.pathname}${final.search}${requested.hash}`;
  }
  return `${final.pathname}${final.search}${final.hash}`;
}

function applyScrollAfterNavigation(url: string, scrollBehavior: boolean | ScrollBehavior, historyMode: boolean): void {
  if (scrollBehavior === false) return;
  const behavior = scrollBehavior === true ? "auto" : scrollBehavior;
  if (!historyMode) {
    restoreScrollPosition(undefined, behavior);
    return;
  }
  if (!scrollToHashFromUrl(url, behavior)) {
    window.scrollTo({ top: 0, behavior });
  }
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

    if (options.history !== false) {
      const historyPath = navigationScrollUrl(url, result.url || url);
      const state = { [OTOK_HISTORY_STATE_KEY]: true, url: historyPath };

      if (options.replace) {
        history.replaceState(state, "", historyPath);
      } else {
        history.pushState(state, "", historyPath);
      }
    }

    const navigationGeneration = beginHydrationNavigation();
    const hydrateOpts = {
      navigationGeneration,
      onError: (error: unknown) => options.onError?.(error),
    };

    let applied = false;
    await withViewTransition(async () => {
      applied = applySoftNavigationDocument(result.document);
      if (!applied) return;
      await hydrateIslandsEager(document, registry, hydrateOpts);
    });

    if (!applied) {
      window.location.assign(url);
      return false;
    }

    void hydrateIslandsDeferred(document, registry, hydrateOpts);

    applyScrollAfterNavigation(
      navigationScrollUrl(url, result.url || url),
      options.scroll ?? true,
      options.history !== false,
    );

    restoreFocus();

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

export function isSoftNavForm(
  form: HTMLFormElement,
  submitter?: HTMLElement,
  location: Location = window.location,
): boolean {
  if (form.hasAttribute(OTOK_NO_NAV_ATTR) || submitter?.hasAttribute(OTOK_NO_NAV_ATTR)) return false;
  const analysis = analyzeSoftNavFormSupport(form, submitter, location);
  return analysis.ok;
}

export type { SoftFormSubmitResult } from "./soft-nav-form.js";
export {
  analyzeSoftNavFormSupport,
  formDataWithSubmitter,
  isSoftFormSubmitSettled,
  nativeRequestSubmit,
  softFormSubmitToLegacyBoolean,
} from "./soft-nav-form.js";

export async function submitSoftNavigationFormResult(
  form: HTMLFormElement,
  submitter: HTMLElement | undefined,
  registry: IslandRegistry,
  options: Pick<SoftNavOptions, "onError" | "scroll"> = {},
): Promise<SoftFormSubmitResult> {
  const analysis = analyzeSoftNavFormSupport(form, submitter, window.location);
  if (!analysis.ok) {
    return { kind: "native-fallback" };
  }

  const generation = ++activeFormSubmissionGeneration;
  activeNavigation?.abort();
  const controller = new AbortController();
  activeNavigation = controller;

  const { url: fetchUrl, init } = buildSoftFormFetchInit(form, submitter, analysis, controller.signal);
  let sent = false;

  try {
    sent = true;
    const response = await fetch(fetchUrl.href, init);
    if (generation !== activeFormSubmissionGeneration) {
      return { kind: "stale" };
    }

    const finalUrl = response.url || fetchUrl.href;
    const final = new URL(finalUrl, window.location.href);
    if (final.origin !== window.location.origin) {
      return {
        kind: "ambiguous",
        message: "Cross-origin response after form submission.",
      };
    }

    const showHtml = response.ok || isValidationHtmlResponse(response);
    if (!showHtml) {
      return {
        kind: sent ? "ambiguous" : "error",
        message: sent ? defaultSoftFormErrorMessages.ambiguous : defaultSoftFormErrorMessages.error,
      };
    }

    const html = await response.text();
    if (generation !== activeFormSubmissionGeneration) {
      return { kind: "stale" };
    }

    const nextDoc = new DOMParser().parseFromString(html, "text/html");
    const navigationGeneration = beginHydrationNavigation();
    const hydrateOpts = {
      navigationGeneration,
      onError: (error: unknown) => options.onError?.(error),
    };

    let applied = false;
    await withViewTransition(async () => {
      applied = applySoftNavigationDocument(nextDoc);
      if (!applied) return;
      await hydrateIslandsEager(document, registry, hydrateOpts);
    });

    if (!applied) {
      return {
        kind: sent ? "ambiguous" : "native-fallback",
        message: sent ? defaultSoftFormErrorMessages.ambiguous : undefined,
      };
    }

    void hydrateIslandsDeferred(document, registry, hydrateOpts);

    if (generation !== activeFormSubmissionGeneration) {
      return { kind: "stale" };
    }

    invalidateSoftNavPrefetch({ reason: "mutation" });

    const historyPath = historyPathFromUrl(finalUrl);
    const currentPath = historyPathFromUrl(window.location.href);
    if (historyPath !== currentPath) {
      saveScrollPosition(currentPath);
      history.pushState({ [OTOK_HISTORY_STATE_KEY]: true, url: historyPath }, "", historyPath);
    }

    restoreFocus();

    applyScrollAfterNavigation(finalUrl, options.scroll ?? true, true);

    return { kind: isValidationHtmlResponse(response) ? "validation" : "handled" };
  } catch (error) {
    if (generation !== activeFormSubmissionGeneration) {
      return { kind: "stale" };
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return { kind: "aborted", message: defaultSoftFormErrorMessages.aborted };
    }
    options.onError?.(error);
    return {
      kind: sent ? "error" : "native-fallback",
      message: sent ? defaultSoftFormErrorMessages.error : undefined,
    };
  } finally {
    if (activeNavigation === controller) activeNavigation = null;
  }
}

/** @returns true when the enhanced path applied HTML (success or validation). */
export async function submitSoftNavigationForm(
  form: HTMLFormElement,
  submitter: HTMLElement | undefined,
  registry: IslandRegistry,
  options: Pick<SoftNavOptions, "onError" | "scroll"> = {},
): Promise<boolean> {
  const result = await submitSoftNavigationFormResult(form, submitter, registry, options);
  return softFormSubmitToLegacyBoolean(result);
}

export function setupSoftNavigation(registry: IslandRegistry, options: SoftNavOptions = {}): () => void {
  const linksEnabled = options.links !== false;
  const formsEnabled = options.forms === true;
  const prefetchEnabled = linksEnabled && options.prefetch !== false;
  const initialPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (!history.state?.[OTOK_HISTORY_STATE_KEY]) {
    history.replaceState({ [OTOK_HISTORY_STATE_KEY]: true, url: initialPath }, "", initialPath);
  }

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
    saveScrollPosition();
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
    if (form.hasAttribute(OTOK_NO_NAV_ATTR) || submitter?.hasAttribute(OTOK_NO_NAV_ATTR)) return;

    const analysis = analyzeSoftNavFormSupport(form, submitter, window.location);
    if (!analysis.ok) return;

    event.preventDefault();
    if (inFlightForms.has(form)) return;
    inFlightForms.add(form);
    setFormSubmitting(form, true);
    clearFormSubmitError(form);

    void submitSoftNavigationFormResult(form, submitter, registry, {
      onError: options.onError,
      scroll: options.scroll,
    })
      .then((result) => {
        if (result.kind === "native-fallback") {
          nativeRequestSubmit(form, submitter);
          return;
        }
        if (result.kind === "handled" || result.kind === "validation") {
          options.onNavigate?.({ url: form.action || window.location.href });
          return;
        }
        if (result.kind === "stale") return;
        const message =
          result.message ??
          (result.kind === "aborted"
            ? defaultSoftFormErrorMessages.aborted
            : result.kind === "ambiguous"
              ? defaultSoftFormErrorMessages.ambiguous
              : defaultSoftFormErrorMessages.error);
        showFormSubmitError(form, message);
      })
      .finally(() => {
        setFormSubmitting(form, false);
        inFlightForms.delete(form);
      });
  };

  const onPopState = (event: PopStateEvent) => {
    const stateUrl = typeof event.state?.url === "string" ? event.state.url : undefined;
    const path = stateUrl ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
    void softNavigate(path, registry, {
      history: false,
      onError: options.onError,
      scroll: false,
    }).then((applied) => {
      if (!applied) return;
      restoreScrollPosition(stateUrl);
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (stateUrl && currentPath !== stateUrl) {
        history.replaceState({ [OTOK_HISTORY_STATE_KEY]: true, url: stateUrl }, "", stateUrl);
      }
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
    invalidateSoftNavPrefetch({ reason: "manual" });
  };
}
