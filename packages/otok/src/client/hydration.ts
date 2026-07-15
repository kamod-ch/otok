import { h, type ComponentType } from "preact";
import { hydrate } from "preact";
import { cssEscape } from "../shared/css.js";
import { OTOK_CANCEL_HYDRATION } from "../shared/navigation.js";
import { decodeIslandProps, type IslandProps, type IslandRegistry } from "../shared/islands.js";

interface PendingHydration {
  abort: () => void;
}

const pendingHydrations = new WeakMap<Element, PendingHydration>();

export function cancelPendingHydration(root: ParentNode): void {
  for (const element of root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")) {
    pendingHydrations.get(element)?.abort();
    pendingHydrations.delete(element);
  }
}

export async function hydrateIsland(
  element: Element,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void> {
  const id = element.getAttribute("data-otok-island");
  if (!id || element.getAttribute("data-otok-hydrated") === "true") return;

  const load = registry[id];
  if (!load) {
    const error = new Error(`otok: No island registered for "${id}".`);
    if (onError) onError(error, element);
    else throw error;
    return;
  }

  try {
    const mod = await load();
    const Component = mod.default ?? mod[id];
    if (typeof Component !== "function") {
      throw new Error(`otok: Island "${id}" does not export a component.`);
    }
    const props = decodeIslandPropsFromElement(element);
    hydrate(h(Component as ComponentType<IslandProps>, props), element);
    element.setAttribute("data-otok-hydrated", "true");
    pendingHydrations.delete(element);
  } catch (error) {
    if (onError) onError(error, element);
    else throw error;
  }
}

function decodeIslandPropsFromElement(element: Element): IslandProps {
  const propsId = element.getAttribute("data-otok-props-id");
  if (propsId) {
    const script = element.ownerDocument.querySelector(
      `script[type="application/json"][data-otok-props-for="${cssEscape(propsId)}"]`,
    );
    if (script?.textContent) return JSON.parse(script.textContent) as IslandProps;
  }

  return decodeIslandProps(element.getAttribute("data-otok-props"));
}

function trackPending(element: Element, abort: () => void): void {
  pendingHydrations.get(element)?.abort();
  pendingHydrations.set(element, { abort });
}

function scheduleIslandHydration(
  element: Element,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void> {
  const strategy = element.getAttribute("data-otok-strategy") ?? "load";
  if (strategy === "idle") return hydrateWhenIdle(element, registry, onError);
  if (strategy === "visible") return hydrateWhenVisible(element, registry, onError);
  if (strategy === "media") return hydrateWhenMediaMatches(element, registry, onError);
  return hydrateIsland(element, registry, onError);
}

function hydrateWhenIdle(
  element: Element,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let cancelled = false;
    const idleId = { value: 0 as number | undefined };
    const timeoutId = { value: undefined as ReturnType<typeof globalThis.setTimeout> | undefined };

    const cleanup = () => {
      if (cancelled) return;
      cancelled = true;
      const cancelIdle = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (idleId.value !== undefined && cancelIdle) {
        cancelIdle(idleId.value);
        idleId.value = undefined;
      }
      if (timeoutId.value !== undefined) {
        globalThis.clearTimeout(timeoutId.value);
        timeoutId.value = undefined;
      }
      pendingHydrations.delete(element);
    };

    trackPending(element, cleanup);

    const run = () => {
      if (cancelled) return resolve();
      void hydrateIsland(element, registry, onError).then(resolve);
    };

    const idle = (window as Window & { requestIdleCallback?: (callback: () => void) => number }).requestIdleCallback;
    if (idle) {
      idleId.value = idle(run);
    } else {
      timeoutId.value = globalThis.setTimeout(run, 1);
    }

    element.addEventListener(
      OTOK_CANCEL_HYDRATION,
      () => {
        cleanup();
        resolve();
      },
      { once: true },
    );
  });
}

function hydrateWhenVisible(
  element: Element,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void> {
  if (!("IntersectionObserver" in window)) return hydrateIsland(element, registry, onError);

  return new Promise((resolve) => {
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled || !entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        pendingHydrations.delete(element);
        void hydrateIsland(element, registry, onError).then(resolve);
      },
      { rootMargin: element.getAttribute("data-otok-root-margin") ?? "0px" },
    );

    trackPending(element, () => {
      cancelled = true;
      observer.disconnect();
    });

    observer.observe(element);

    element.addEventListener(
      OTOK_CANCEL_HYDRATION,
      () => {
        cancelled = true;
        observer.disconnect();
        pendingHydrations.delete(element);
        resolve();
      },
      { once: true },
    );
  });
}

function hydrateWhenMediaMatches(
  element: Element,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void> {
  const media = element.getAttribute("data-otok-media");
  if (!media || !("matchMedia" in window)) return hydrateIsland(element, registry, onError);

  const query = window.matchMedia(media);
  if (query.matches) return hydrateIsland(element, registry, onError);

  return new Promise((resolve) => {
    let cancelled = false;
    const onChange = () => {
      if (cancelled || !query.matches) return;
      query.removeEventListener("change", onChange);
      pendingHydrations.delete(element);
      void hydrateIsland(element, registry, onError).then(resolve);
    };

    trackPending(element, () => {
      cancelled = true;
      query.removeEventListener("change", onChange);
    });

    query.addEventListener("change", onChange);

    element.addEventListener(
      OTOK_CANCEL_HYDRATION,
      () => {
        cancelled = true;
        query.removeEventListener("change", onChange);
        pendingHydrations.delete(element);
        resolve();
      },
      { once: true },
    );
  });
}

export function hydrateIslands(
  root: ParentNode,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void[]> {
  const islands = [...root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")];
  return Promise.all(islands.map((element) => scheduleIslandHydration(element, registry, onError)));
}
