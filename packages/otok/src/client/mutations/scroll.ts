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
  if (pos) window.scrollTo({ left: pos.x, top: pos.y, behavior });
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

export async function withViewTransition(update: () => void | Promise<void>): Promise<void> {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    let updatePromise: Promise<void> = Promise.resolve();
    const transition = (document as Document & { startViewTransition: (cb: () => void) => { finished: Promise<void> } })
      .startViewTransition(() => {
        try {
          updatePromise = Promise.resolve(update());
        } catch (error) {
          updatePromise = Promise.reject(error);
        }
      });

    await updatePromise;

    try {
      await transition.finished;
    } catch (error) {
      // Browsers may abort view transitions if the DOM update takes too long or
      // another navigation starts. The DOM has already been updated, so keep the
      // navigation instead of surfacing a noisy unhandled TimeoutError/AbortError.
      if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) return;
      throw error;
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
