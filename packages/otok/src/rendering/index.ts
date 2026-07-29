export { defineRendering } from "./define.js";
export { resolveRenderPlan, mergeRenderingConfig } from "./resolve.js";
export type {
  RenderingConfig,
  RenderingDefinition,
  RenderMode,
  ResolvedRenderMode,
  PrerenderConfig,
  RenderPlan,
  RenderContext,
  RenderingWarning,
} from "./types.js";

export {
  assertRenderCapability,
  type AdapterRenderCapabilities,
} from "./capabilities.js";

export {
  collectPrerenderEntries,
  type PrerenderEntry,
  type PrerenderManifest,
} from "./prerender-manifest.js";

export { scanRenderingFromSource, routeWantsPrerender } from "./scan.js";

export { OTOK_LOADING_ATTR, wrapLoadingBoundary } from "./loading.js";

export {
  OTOK_DEFERRED,
  createDeferredSlot,
  type DeferredSlot,
  type DeferredRenderResult,
} from "./deferred.js";

export {
  isDeferredRenderResult,
  collectDeferredSlots,
  hasDeferredSlots,
  unwrapImmediateData,
  resolveDeferredData,
} from "./deferred-resolve.js";

export {
  withDeferredRenderContext,
  getDeferredRenderContext,
  registerDeferredBoundary,
  splitHtmlAtDeferredMarkers,
  findDeferredMarker,
  deferredMarkerHtml,
  OTOK_DEFERRED_MARKER_ATTR,
  type DeferredRenderContext,
  type RegisteredDeferredBoundary,
} from "./deferred-context.js";

export { DeferredBoundary, type DeferredBoundaryProps } from "../shared/deferred-boundary.js";
