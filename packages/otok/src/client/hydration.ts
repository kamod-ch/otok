import { h, type ComponentType } from "preact";
import { hydrate } from "preact";
import { decodeIslandProps, type IslandProps, type IslandRegistry } from "../shared/islands.js";

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

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replaceAll('"', '\\"').replaceAll("\\", "\\\\");
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
    const run = () => void hydrateIsland(element, registry, onError).then(resolve);
    const idle = (window as Window & { requestIdleCallback?: (callback: () => void) => number }).requestIdleCallback;
    if (idle) {
      idle(run);
    } else {
      globalThis.setTimeout(run, 1);
    }
  });
}

function hydrateWhenVisible(
  element: Element,
  registry: IslandRegistry,
  onError?: (error: unknown, element: Element) => void,
): Promise<void> {
  if (!("IntersectionObserver" in window)) return hydrateIsland(element, registry, onError);

  return new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void hydrateIsland(element, registry, onError).then(resolve);
      },
      { rootMargin: element.getAttribute("data-otok-root-margin") ?? "0px" },
    );
    observer.observe(element);
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
    const onChange = () => {
      if (!query.matches) return;
      query.removeEventListener("change", onChange);
      void hydrateIsland(element, registry, onError).then(resolve);
    };
    query.addEventListener("change", onChange);
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
