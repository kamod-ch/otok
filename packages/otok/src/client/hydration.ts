import { h, hydrate, render, type ComponentType } from "preact";
import { cssEscape } from "../shared/css.js";
import { OTOK_CANCEL_HYDRATION } from "../shared/navigation.js";
import { decodeIslandProps, type IslandProps, type IslandRegistry } from "../shared/islands.js";

interface PendingHydration {
  abort: () => void;
}

const pendingHydrations = new WeakMap<Element, PendingHydration>();

/** Invalidates in-flight island module loads after soft navigation. */
let hydrationNavigationGeneration = 0;

export function beginHydrationNavigation(): number {
  hydrationNavigationGeneration += 1;
  return hydrationNavigationGeneration;
}

export function getHydrationNavigationGeneration(): number {
  return hydrationNavigationGeneration;
}

export interface HydrateIslandsOptions {
  onError?: (error: unknown, element: Element) => void;
  /** When set, hydration aborts if a newer navigation started. Omit on initial client boot. */
  navigationGeneration?: number;
}

export function cancelPendingHydration(root: ParentNode): void {
  for (const element of root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")) {
    pendingHydrations.get(element)?.abort();
    pendingHydrations.delete(element);
  }
}

/** Unmount hydrated island roots inside a subtree that will be replaced. Layout islands outside `root` stay mounted. */
export function unmountHydratedIslands(root: ParentNode): void {
  for (const element of root.querySelectorAll('[data-otok-island][data-otok-hydrated="true"]')) {
    if (!(element instanceof Element)) continue;
    pendingHydrations.get(element)?.abort();
    pendingHydrations.delete(element);
    render(null, element);
    element.removeAttribute("data-otok-hydrated");
  }
}

function navigationStillActive(navigationGeneration?: number): boolean {
  if (navigationGeneration === undefined) return true;
  return navigationGeneration === hydrationNavigationGeneration;
}

function isTopLevelIslandMarker(element: Element): boolean {
  const parentIsland = element.parentElement?.closest("[data-otok-island]");
  return !parentIsland;
}

function listIslandCandidates(root: ParentNode): Element[] {
  return [...root.querySelectorAll("[data-otok-island]:not([data-otok-hydrated])")].filter(isTopLevelIslandMarker);
}

function isEagerIsland(element: Element): boolean {
  const strategy = element.getAttribute("data-otok-strategy") ?? "load";
  if (strategy === "load") return true;
  if (strategy === "idle") return false;
  if (strategy === "visible") return !("IntersectionObserver" in globalThis);
  if (strategy === "media") {
    const media = element.getAttribute("data-otok-media");
    if (!media || typeof globalThis.matchMedia !== "function") return true;
    return globalThis.matchMedia(media).matches;
  }
  return true;
}

export async function hydrateIsland(
  element: Element,
  registry: IslandRegistry,
  options: HydrateIslandsOptions = {},
): Promise<void> {
  const { onError, navigationGeneration } = options;
  const id = element.getAttribute("data-otok-island");
  if (!id || element.getAttribute("data-otok-hydrated") === "true") return;
  if (!element.isConnected) return;
  if (!navigationStillActive(navigationGeneration)) return;

  const load = registry[id];
  if (!load) {
    const error = new Error(`otok: No island registered for "${id}".`);
    if (onError) onError(error, element);
    else throw error;
    return;
  }

  try {
    const mod = await load();
    if (!element.isConnected || element.getAttribute("data-otok-hydrated") === "true") return;
    if (!navigationStillActive(navigationGeneration)) return;

    const Component = mod.default ?? mod[id];
    if (typeof Component !== "function") {
      throw new Error(`otok: Island "${id}" does not export a component.`);
    }
    const props = decodeIslandPropsFromElement(element);
    hydrate(h(Component as ComponentType<IslandProps>, props), element);
    element.setAttribute("data-otok-hydrated", "true");
    pendingHydrations.delete(element);
  } catch (error) {
    if (!navigationStillActive(navigationGeneration)) return;
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

function trackPending(element: Element, pending: PendingHydration): void {
  pendingHydrations.get(element)?.abort();
  pendingHydrations.set(element, pending);
}

function scheduleIslandHydration(
  element: Element,
  registry: IslandRegistry,
  options: HydrateIslandsOptions,
): Promise<void> {
  const strategy = element.getAttribute("data-otok-strategy") ?? "load";
  if (strategy === "idle") return hydrateWhenIdle(element, registry, options);
  if (strategy === "visible") return hydrateWhenVisible(element, registry, options);
  if (strategy === "media") return hydrateWhenMediaMatches(element, registry, options);
  return hydrateIsland(element, registry, options);
}

function hydrateWhenIdle(element: Element, registry: IslandRegistry, options: HydrateIslandsOptions): Promise<void> {
  return new Promise((resolve) => {
    let cancelled = false;
    const idleId = { value: 0 as number | undefined };
    const timeoutId = { value: undefined as ReturnType<typeof globalThis.setTimeout> | undefined };

    const settle = () => {
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
      resolve();
    };

    trackPending(element, { abort: settle });

    const run = () => {
      if (cancelled) {
        resolve();
        return;
      }
      void hydrateIsland(element, registry, options).finally(resolve);
    };

    const idle = (window as Window & { requestIdleCallback?: (callback: () => void) => number }).requestIdleCallback;
    if (idle) {
      idleId.value = idle(run);
    } else {
      timeoutId.value = globalThis.setTimeout(run, 1);
    }

    element.addEventListener(OTOK_CANCEL_HYDRATION, settle, { once: true });
  });
}

function hydrateWhenVisible(element: Element, registry: IslandRegistry, options: HydrateIslandsOptions): Promise<void> {
  if (!("IntersectionObserver" in globalThis)) return hydrateIsland(element, registry, options);

  return new Promise((resolve) => {
    let cancelled = false;
    const settle = () => {
      if (cancelled) return;
      cancelled = true;
      observer.disconnect();
      pendingHydrations.delete(element);
      resolve();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled || !entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        pendingHydrations.delete(element);
        void hydrateIsland(element, registry, options).finally(resolve);
      },
      { rootMargin: element.getAttribute("data-otok-root-margin") ?? "0px" },
    );

    trackPending(element, { abort: settle });

    observer.observe(element);
    element.addEventListener(OTOK_CANCEL_HYDRATION, settle, { once: true });
  });
}

function hydrateWhenMediaMatches(
  element: Element,
  registry: IslandRegistry,
  options: HydrateIslandsOptions,
): Promise<void> {
  const media = element.getAttribute("data-otok-media");
  if (!media || typeof globalThis.matchMedia !== "function") return hydrateIsland(element, registry, options);

  const query = globalThis.matchMedia(media);
  if (query.matches) return hydrateIsland(element, registry, options);

  return new Promise((resolve) => {
    let cancelled = false;
    const onChange = () => {
      if (cancelled || !query.matches) return;
      query.removeEventListener("change", onChange);
      pendingHydrations.delete(element);
      void hydrateIsland(element, registry, options).finally(resolve);
    };

    const settle = () => {
      if (cancelled) return;
      cancelled = true;
      query.removeEventListener("change", onChange);
      pendingHydrations.delete(element);
      resolve();
    };

    trackPending(element, { abort: settle });

    query.addEventListener("change", onChange);
    element.addEventListener(OTOK_CANCEL_HYDRATION, settle, { once: true });
  });
}

/** Hydrates every island under `root`, including deferred strategies (idle/visible/media). */
export function hydrateIslands(
  root: ParentNode,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void[]> {
  return hydrateIslandsWithOptions(root, registry, { onError });
}

function hydrateIslandsWithOptions(
  root: ParentNode,
  registry: IslandRegistry,
  options: HydrateIslandsOptions,
  filter?: (element: Element) => boolean,
): Promise<void[]> {
  const islands = listIslandCandidates(root).filter((element) => (filter ? filter(element) : true));
  return Promise.all(islands.map((element) => scheduleIslandHydration(element, registry, options)));
}

/** Await only islands that hydrate synchronously or without waiting on observers (soft-nav completion path). */
export function hydrateIslandsEager(
  root: ParentNode,
  registry: IslandRegistry,
  options: HydrateIslandsOptions = {},
): Promise<void[]> {
  return hydrateIslandsWithOptions(root, registry, options, isEagerIsland);
}

/** Schedule deferred islands without blocking navigation (idle, visible, non-matching media). */
export function hydrateIslandsDeferred(
  root: ParentNode,
  registry: IslandRegistry,
  options: HydrateIslandsOptions = {},
): Promise<void[]> {
  return hydrateIslandsWithOptions(root, registry, options, (element) => !isEagerIsland(element));
}
