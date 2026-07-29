import type { RenderingConfig, RenderingDefinition } from "./types.js";

/** Declare route rendering and caching behavior. */
export function defineRendering(config: RenderingConfig): RenderingDefinition {
  return { ...config, __otokRendering: true };
}

export type { RenderingConfig, RenderingDefinition, RenderMode, ResolvedRenderMode, PrerenderConfig, RenderPlan, RenderContext, RenderingWarning } from "./types.js";
