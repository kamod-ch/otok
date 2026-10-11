import { OTOK_HISTORY_STATE_KEY } from "../../shared/navigation.js";

const scrollPositions = new Map<string, { x: number; y: number }>();
const focusSelectors = new Map<string, string>();

export function saveScrollPosition(url?: string): void {
  if (typeof window === "undefined") return;
  const key = url ?? currentPath();
  scrollPositions.set(key, { x: window.scrollX, y: window.scrollY });
}

export function restoreScrollPosition(url?: string, behavior: ScrollBehavior = "auto"): void {
  if (typeof window === "undefined") return;
  const key = url ?? currentPath();
  const pos = scrollPositions.get(key);
  if (!pos) return;
  const apply = () => window.scrollTo({ left: pos.x, top: pos.y, behavior });
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(apply));
    return;
  }
  apply();
}

/** Scroll to a same-document hash target from a URL string. Returns true when an element was scrolled. */
export function scrollToHashFromUrl(url: string, behavior: ScrollBehavior = "auto"): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const hash = new URL(url, window.location.href).hash;
  if (!hash || hash === "#") return false;
  const target = document.getElementById(decodeURIComponent(hash.slice(1))) ?? document.querySelector(hash);
  if (!(target instanceof HTMLElement)) return false;
  target.scrollIntoView({ behavior });
  return true;
}

export function saveFocusSelector(url: string, selector: string): void {
  focusSelectors.set(url, selector);
}

export function restoreFocus(url?: string): void {
  if (typeof document === "undefined") return;
  const key = url ?? currentPath();
  const selector = focusSelectors.get(key);
  const target = selector
    ? document.querySelector(selector)
    : document.querySelector('[aria-invalid="true"], [role="alert"]');
  if (target instanceof HTMLElement) target.focus();
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !("matchMedia" in window)) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ViewTransitionLike = {
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

function isAnimationAbort(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

export async function withViewTransition(update: () => void | Promise<void>): Promise<void> {
  if (typeof document !== "undefined" && "startViewTransition" in document && !prefersReducedMotion()) {
    let transition: ViewTransitionLike;
    try {
      transition = (
        document as Document & {
          startViewTransition: (cb: () => void | Promise<void>) => ViewTransitionLike;
        }
      ).startViewTransition(() => Promise.resolve().then(update));
    } catch (error) {
      throw error;
    }

    const finishedOutcome = transition.finished.then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    );

    await transition.updateCallbackDone;

    const finished = await finishedOutcome;
    if (!finished.ok) {
      if (isAnimationAbort(finished.error)) return;
      throw finished.error;
    }
    return;
  }
  await update();
}

export function patchHistoryScroll(): void {
  if (typeof window === "undefined") return;

  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);

  history.pushState = (state, title, url) => {
    saveScrollPosition();
    const next = typeof url === "string" ? url : currentPath();
    originalPush({ ...state, [OTOK_HISTORY_STATE_KEY]: true, url: next }, title, url);
  };

  history.replaceState = (state, title, url) => {
    saveScrollPosition();
    const next = typeof url === "string" ? url : currentPath();
    originalReplace({ ...state, [OTOK_HISTORY_STATE_KEY]: true, url: next }, title, url);
  };
}
