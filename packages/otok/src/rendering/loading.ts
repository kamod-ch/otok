import { OTOK_DEFERRED_MARKER_ATTR } from "./deferred-context.js";

/** Marks a DOM region replaced when deferred loader data arrives. */
export const OTOK_LOADING_ATTR = "data-otok-loading";

/**
 * Wrap fallback HTML in a deferred loading marker.
 * Prefer `<DeferredBoundary>` in Preact routes — this helper is for string templates.
 */
export function wrapLoadingBoundary(id: string, html = ""): string {
  const safeId = escapeAttr(id);
  if (!html) {
    return `<div ${OTOK_LOADING_ATTR}="${safeId}" ${OTOK_DEFERRED_MARKER_ATTR}></div>`;
  }
  return `<div ${OTOK_LOADING_ATTR}="${safeId}">${html}</div>`;
}

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
