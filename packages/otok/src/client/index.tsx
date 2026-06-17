import { Fragment, h, type ComponentType } from "preact";
import { hydrate } from "preact";
import {
  decodeIslandProps,
  encodeIslandPropsForHtml,
  resolveIslandId,
  type IslandHydrationStrategy,
  type IslandProps,
  type IslandRegistry,
} from "../shared/islands.js";
import { registerRenderedIsland } from "../shared/island-context.js";

export interface IslandComponentProps<Props extends IslandProps = IslandProps> {
  component: ComponentType<Props>;
  props?: Props;
  id?: string;
  strategy?: IslandHydrationStrategy;
  media?: string;
  rootMargin?: string;
}

declare global {
  interface Window {
    __OTOK_ISLANDS__?: IslandRegistry;
  }
}

export function Island<Props extends IslandProps = IslandProps>({
  component: Component,
  props,
  id,
  strategy = "load",
  media,
  rootMargin,
}: IslandComponentProps<Props>) {
  if (typeof window !== "undefined") {
    return <Fragment />;
  }

  const islandId = resolveIslandId(Component as ComponentType<IslandProps>, id);
  if (!islandId) {
    throw new Error("otok: Island components need a name, displayName, or explicit id.");
  }

  const instanceId = registerRenderedIsland(islandId);
  const encodedProps = encodeIslandPropsForHtml(props, instanceId);

  return (
    <Fragment>
      <div
        data-otok-island={islandId}
        data-otok-props={encodedProps.attribute}
        data-otok-props-id={encodedProps.propsId}
        data-otok-strategy={strategy}
        data-otok-media={media}
        data-otok-root-margin={rootMargin}
        data-otok-island-root=""
      >
        <Component {...(props as Props)} />
      </div>
      {encodedProps.scriptJson ? (
        <script
          type="application/json"
          data-otok-props-for={encodedProps.propsId}
          dangerouslySetInnerHTML={{ __html: encodedProps.scriptJson }}
        />
      ) : null}
    </Fragment>
  );
}

export interface CreateOtokClientOptions {
  registry?: IslandRegistry;
  root?: ParentNode;
  onError?: (error: unknown, element: Element) => void;
}

async function hydrateIsland(
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

export function createOtokClient(options: CreateOtokClientOptions = {}): void {
  const registry = options.registry ?? window.__OTOK_ISLANDS__;
  if (!registry) {
    throw new Error("otok: createOtokClient() needs an island registry.");
  }

  const root = options.root ?? document;
  const islands = [...root.querySelectorAll("[data-otok-island]")];
  void Promise.all(islands.map((element) => scheduleIslandHydration(element, registry, options.onError)));
}

export type { InferIslandProps } from "../shared/routes.js";
export type { IslandHydrationStrategy, IslandProps, IslandRegistry } from "../shared/islands.js";
