import { Fragment, h, type ComponentType } from "preact";
import {
  encodeIslandPropsForHtml,
  resolveIslandId,
  type IslandHydrationStrategy,
  type IslandProps,
  type IslandRegistry,
} from "../shared/islands.js";
import { registerRenderedIsland } from "../shared/island-context.js";
import { hydrateIslands } from "./hydration.js";
import { prefetchSoftNavUrl, setupSoftNavigation, softNavigate, type SoftNavOptions } from "./soft-nav.js";

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

let islandClientWarningShown = false;

export function Island<Props extends IslandProps = IslandProps>({
  component: Component,
  props,
  id,
  strategy = "load",
  media,
  rootMargin,
}: IslandComponentProps<Props>) {
  if (typeof window !== "undefined") {
    if (
      !islandClientWarningShown &&
      typeof import.meta !== "undefined" &&
      (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV
    ) {
      islandClientWarningShown = true;
      console.warn(
        "otok: <Island> is server-only. It renders nothing in the browser; islands hydrate from SSR markers.",
      );
    }
    return <Fragment />;
  }

  const islandId = resolveIslandId(Component as ComponentType<IslandProps>, id);
  if (!islandId) {
    throw new Error("otok: Island components need a name, displayName, or explicit id.");
  }

  const instanceId = registerRenderedIsland(islandId);
  const encodedProps = encodeIslandPropsForHtml(props, instanceId);
  const hydrationStrategy = strategy === "client-only" ? "load" : strategy;

  return (
    <Fragment>
      <div
        data-otok-island={islandId}
        data-otok-props={encodedProps.attribute}
        data-otok-props-id={encodedProps.propsId}
        data-otok-strategy={hydrationStrategy}
        data-otok-media={media}
        data-otok-root-margin={rootMargin}
        data-otok-island-root=""
      >
        {strategy === "client-only" ? null : <Component {...(props as Props)} />}
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
  softNav?: boolean | SoftNavOptions;
}

export function createOtokClient(options: CreateOtokClientOptions = {}): void {
  const registry = options.registry ?? window.__OTOK_ISLANDS__;
  if (!registry) {
    throw new Error("otok: createOtokClient() needs an island registry.");
  }

  const root = options.root ?? document;
  void hydrateIslands(root, registry, options.onError);

  if (options.softNav) {
    const softNavOptions = options.softNav === true ? {} : options.softNav;
    setupSoftNavigation(registry, {
      ...softNavOptions,
      onError: (error) => {
        softNavOptions.onError?.(error);
        if (error instanceof Error && error.message.startsWith("otok:")) {
          options.onError?.(error, document.body);
        }
      },
    });
  }
}

export type { InferIslandProps, OtokChrome } from "../shared/routes.js";
export type { IslandHydrationStrategy, IslandProps, IslandRegistry } from "../shared/islands.js";
export type { SoftNavOptions } from "./soft-nav.js";
export { cancelPendingHydration, hydrateIslands } from "./hydration.js";
export { isSoftNavLink, prefetchSoftNavUrl, setupSoftNavigation, softNavigate } from "./soft-nav.js";
