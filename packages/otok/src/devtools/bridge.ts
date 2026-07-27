import type { OtokRoute } from "../shared/routes.js";

export type OtokDevtoolsRenderMode = "ssr" | "csr" | "islands";

export interface OtokDevtoolsRouteNode {
  id: string;
  path: string;
  params: string[];
  hasLoader: boolean;
  hasAction: boolean;
  middlewareCount: number;
  layoutCount: number;
  client: boolean;
}

export interface OtokDevtoolsMiddlewareEvent {
  route: string;
  index: number;
  name?: string;
  durationMs: number;
}

export interface OtokDevtoolsLoaderEvent {
  route: string;
  kind: "loader" | "action";
  durationMs: number;
  status: number;
  redirect?: string;
  validation?: boolean;
}

export interface OtokDevtoolsPluginEvent {
  plugin: string;
  hook: string;
  durationMs: number;
}

export interface OtokDevtoolsRequestSnapshot {
  id: string;
  method: string;
  pathname: string;
  route?: string;
  renderMode: OtokDevtoolsRenderMode;
  status: number;
  redirect?: string;
  islands: string[];
  locale?: string;
  auth?: {
    authenticated: boolean;
    userId?: string;
    roles?: string[];
  };
  timings: {
    middlewareMs: number;
    loaderMs: number;
    renderMs: number;
    totalMs: number;
  };
  hydrationErrors: string[];
  startedAt: number;
}

export interface OtokDevtoolsSnapshot {
  routes: OtokDevtoolsRouteNode[];
  plugins: Array<{ name: string; version?: string }>;
  middleware: OtokDevtoolsMiddlewareEvent[];
  loaders: OtokDevtoolsLoaderEvent[];
  pluginHooks: OtokDevtoolsPluginEvent[];
  requests: OtokDevtoolsRequestSnapshot[];
  updatedAt: number;
}

export interface OtokDevtoolsBridge {
  enabled: boolean;
  setRoutes(routes: OtokRoute[]): void;
  setPlugins(plugins: Array<{ name: string; version?: string }>): void;
  recordPluginHook(plugin: string, hook: string, durationMs: number): void;
  beginRequest(input: { method: string; pathname: string }): string;
  recordMiddleware(event: Omit<OtokDevtoolsMiddlewareEvent, "durationMs"> & { durationMs: number }): void;
  recordLoader(event: OtokDevtoolsLoaderEvent): void;
  finishRequest(input: {
    id: string;
    route?: string;
    status: number;
    renderMode: OtokDevtoolsRenderMode;
    islands: string[];
    redirect?: string;
    locale?: string;
    auth?: OtokDevtoolsRequestSnapshot["auth"];
    timings: OtokDevtoolsRequestSnapshot["timings"];
    hydrationErrors?: string[];
  }): void;
  getSnapshot(): OtokDevtoolsSnapshot;
  reset(): void;
}

let activeBridge: OtokDevtoolsBridge | null = null;

export function setOtokDevtoolsBridge(bridge: OtokDevtoolsBridge | null): void {
  activeBridge = bridge;
}

export function getOtokDevtoolsBridge(): OtokDevtoolsBridge | null {
  return activeBridge;
}

function routeNode(route: OtokRoute): OtokDevtoolsRouteNode {
  return {
    id: route.id,
    path: route.path,
    params: route.params,
    hasLoader: Boolean(route.module.loader),
    hasAction: Boolean(route.module.action),
    middlewareCount: route.middleware?.length ?? 0,
    layoutCount: route.layouts?.length ?? 0,
    client: route.module.client === true,
  };
}

export function createOtokDevtoolsBridge(): OtokDevtoolsBridge {
  const routes: OtokDevtoolsRouteNode[] = [];
  const plugins: Array<{ name: string; version?: string }> = [];
  const middleware: OtokDevtoolsMiddlewareEvent[] = [];
  const loaders: OtokDevtoolsLoaderEvent[] = [];
  const pluginHooks: OtokDevtoolsPluginEvent[] = [];
  const requests: OtokDevtoolsRequestSnapshot[] = [];
  const maxEvents = 100;

  function trim<T>(list: T[]): void {
    while (list.length > maxEvents) list.shift();
  }

  return {
    enabled: true,
    setRoutes(nextRoutes) {
      routes.splice(0, routes.length, ...nextRoutes.map(routeNode));
    },
    setPlugins(nextPlugins) {
      plugins.splice(0, plugins.length, ...nextPlugins);
    },
    recordPluginHook(plugin, hook, durationMs) {
      pluginHooks.push({ plugin, hook, durationMs });
      trim(pluginHooks);
    },
    beginRequest(input) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      requests.push({
        id,
        method: input.method,
        pathname: input.pathname,
        renderMode: "ssr",
        status: 0,
        islands: [],
        timings: { middlewareMs: 0, loaderMs: 0, renderMs: 0, totalMs: 0 },
        hydrationErrors: [],
        startedAt: performance.now(),
      });
      trim(requests);
      return id;
    },
    recordMiddleware(event) {
      middleware.push(event);
      trim(middleware);
    },
    recordLoader(event) {
      loaders.push(event);
      trim(loaders);
    },
    finishRequest(input) {
      const request = requests.find((entry) => entry.id === input.id);
      if (!request) return;
      Object.assign(request, input);
      request.timings.totalMs = performance.now() - request.startedAt;
    },
    getSnapshot() {
      return {
        routes: [...routes],
        plugins: [...plugins],
        middleware: [...middleware],
        loaders: [...loaders],
        pluginHooks: [...pluginHooks],
        requests: [...requests],
        updatedAt: Date.now(),
      };
    },
    reset() {
      middleware.length = 0;
      loaders.length = 0;
      pluginHooks.length = 0;
      requests.length = 0;
    },
  };
}

export function otokDevtoolsEnabled(): boolean {
  return activeBridge?.enabled === true;
}

export function otokDevtoolsSetRoutes(routes: OtokRoute[]): void {
  activeBridge?.setRoutes(routes);
}

export function otokDevtoolsBeginRequest(method: string, pathname: string): string | null {
  return activeBridge?.beginRequest({ method, pathname }) ?? null;
}

export function otokDevtoolsRecordMiddleware(event: OtokDevtoolsMiddlewareEvent): void {
  activeBridge?.recordMiddleware(event);
}

export function otokDevtoolsRecordLoader(event: OtokDevtoolsLoaderEvent): void {
  activeBridge?.recordLoader(event);
}

export function otokDevtoolsFinishRequest(
  input: Parameters<OtokDevtoolsBridge["finishRequest"]>[0],
): void {
  activeBridge?.finishRequest(input);
}

export function otokDevtoolsRecordPluginHook(plugin: string, hook: string, durationMs: number): void {
  activeBridge?.recordPluginHook(plugin, hook, durationMs);
}

export function otokDevtoolsSetPlugins(plugins: Array<{ name: string; version?: string }>): void {
  activeBridge?.setPlugins(plugins);
}

export function sanitizeAuthSnapshot(input: {
  user?: { id?: string; roles?: string[] } | null;
}): OtokDevtoolsRequestSnapshot["auth"] | undefined {
  if (!input.user) return { authenticated: false };
  return {
    authenticated: true,
    userId: input.user.id,
    roles: input.user.roles ? [...input.user.roles] : undefined,
  };
}

export function detectLocaleFromHtml(html: string): string | undefined {
  const match = html.match(/<html[^>]*\slang="([^"]+)"/i);
  return match?.[1];
}

export function detectRenderMode(input: { client: boolean; islands: string[] }): OtokDevtoolsRenderMode {
  if (input.islands.length > 0) return "islands";
  if (input.client) return "csr";
  return "ssr";
}

export function extractIslandIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(/data-otok-island="([^"]+)"/g)) {
    ids.add(match[1]);
  }
  return [...ids];
}

export type {
  OtokDevtoolsBridge as DevtoolsBridge,
  OtokDevtoolsSnapshot as DevtoolsSnapshot,
};
