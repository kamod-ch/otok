import type { CacheConfig } from "../cache/types.js";

/** Route rendering mode. */
export type RenderMode = "ssr" | "ssg" | "hybrid" | "client" | "auto";

/** Resolved mode after `auto` detection and adapter constraints. */
export type ResolvedRenderMode = "ssr" | "ssg" | "client";

export interface PrerenderConfig {
  /** Additional paths to prerender beyond the route's static pattern. */
  paths?: string[] | (() => string[] | Promise<string[]>);
  /** Dynamic param values for prerendering parameterized routes. */
  params?: Record<string, string | string[]> | (() => Record<string, string | string[]> | Promise<Record<string, string | string[]>>);
}

export interface RenderingConfig {
  /** Rendering strategy for this route. Default: `ssr`. */
  mode?: RenderMode;
  /** Enable shell-first HTML streaming. `inherit` uses global `otok.config.ts` default. */
  streaming?: boolean | "inherit";
  /** HTTP cache policy for HTML responses. `false` disables caching. */
  cache?: CacheConfig | false;
  /** Prerender configuration when mode is `ssg` or `hybrid`. */
  prerender?: boolean | PrerenderConfig;
  /** Defer non-critical loader regions until after the shell streams. */
  deferred?: boolean;
}

export interface RenderingDefinition extends RenderingConfig {
  readonly __otokRendering?: true;
}

export interface RenderPlan {
  mode: ResolvedRenderMode;
  streaming: boolean;
  cache: CacheConfig | false;
  prerender?: PrerenderConfig;
  deferred: boolean;
  /** Source route file pattern for diagnostics. */
  routePattern?: string;
}

export interface RenderContext {
  method: string;
  pathname: string;
  params: Record<string, string>;
  cookies: string | null;
  hasAuth: boolean;
  hasSession: boolean;
  locale?: string;
  tenant?: string;
  adapterCapabilities?: ReadonlySet<string>;
  globalStreaming?: boolean;
}

export interface RenderingWarning {
  code: string;
  message: string;
  route?: string;
}
