import { Fragment, h, type ComponentType } from "preact";
import { hydrate } from "preact";
import {
  decodeIslandProps,
  encodeIslandProps,
  resolveIslandId,
  type IslandProps,
  type IslandRegistry,
} from "../shared/islands.js";
import { registerRenderedIsland } from "../server/island-context.js";

export interface IslandComponentProps<Props extends IslandProps = IslandProps> {
  component: ComponentType<Props>;
  props?: Props;
  id?: string;
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
}: IslandComponentProps<Props>) {
  if (typeof window !== "undefined") {
    return <Fragment />;
  }

  const islandId = resolveIslandId(Component as ComponentType<IslandProps>, id);
  if (!islandId) {
    throw new Error("otok: Island components need a name, displayName, or explicit id.");
  }

  registerRenderedIsland(islandId);

  return (
    <div
      data-otok-island={islandId}
      data-otok-props={encodeIslandProps(props)}
      data-otok-island-root=""
    >
      <Component {...(props as Props)} />
    </div>
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
    const props = decodeIslandProps(element.getAttribute("data-otok-props"));
    hydrate(h(Component as ComponentType<IslandProps>, props), element);
    element.setAttribute("data-otok-hydrated", "true");
  } catch (error) {
    if (onError) onError(error, element);
    else throw error;
  }
}

export function createOtokClient(options: CreateOtokClientOptions = {}): void {
  const registry = options.registry ?? window.__OTOK_ISLANDS__;
  if (!registry) {
    throw new Error("otok: createOtokClient() needs an island registry.");
  }

  const root = options.root ?? document;
  const islands = [...root.querySelectorAll("[data-otok-island]")];
  void Promise.all(islands.map((element) => hydrateIsland(element, registry, options.onError)));
}

export type { InferIslandProps } from "../shared/routes.js";
export type { IslandProps, IslandRegistry } from "../shared/islands.js";
