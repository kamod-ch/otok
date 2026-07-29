import type { ComponentChildren } from "preact";

export interface RegisteredDeferredBoundary {
  id: string;
  promise: Promise<unknown>;
  /** Render the resolved slot value to a Preact tree for the second pass. */
  render: (value: unknown) => ComponentChildren;
  fallback?: ComponentChildren;
}

export interface DeferredRenderContext {
  boundaries: RegisteredDeferredBoundary[];
}

let activeContext: DeferredRenderContext | undefined;

export function withDeferredRenderContext<T>(context: DeferredRenderContext, render: () => T): T {
  const previous = activeContext;
  activeContext = context;
  try {
    return render();
  } finally {
    activeContext = previous;
  }
}

export function getDeferredRenderContext(): DeferredRenderContext | undefined {
  return activeContext;
}

export function registerDeferredBoundary(boundary: RegisteredDeferredBoundary): void {
  if (!activeContext) return;
  if (activeContext.boundaries.some((entry) => entry.id === boundary.id)) {
    throw new Error(`[otok:deferred] Duplicate deferred boundary id "${boundary.id}".`);
  }
  activeContext.boundaries.push(boundary);
}

/** Marker attribute used to splice deferred regions out of the critical HTML. */
export const OTOK_DEFERRED_MARKER_ATTR = "data-otok-deferred-marker";

/**
 * Split critical HTML on deferred markers, preserving document order.
 * Markers must be empty self-contained divs emitted by DeferredBoundary.
 */
export function splitHtmlAtDeferredMarkers(
  html: string,
  boundaryIds: string[],
): { segments: string[]; ids: string[] } {
  if (boundaryIds.length === 0) {
    return { segments: [html], ids: [] };
  }

  const ids: string[] = [];
  const segments: string[] = [];
  let remaining = html;

  for (const id of boundaryIds) {
    const match = findDeferredMarker(remaining, id);
    if (!match) {
      throw new Error(`[otok:deferred] Missing loading marker for deferred slot "${id}" in rendered HTML.`);
    }
    segments.push(remaining.slice(0, match.index));
    ids.push(id);
    remaining = remaining.slice(match.index + match.length);
  }

  segments.push(remaining);
  return { segments, ids };
}

/** Match Preact SSR output for an empty deferred marker div. */
export function deferredMarkerHtml(id: string): string {
  return `<div data-otok-loading="${escapeAttr(id)}" ${OTOK_DEFERRED_MARKER_ATTR}></div>`;
}

/**
 * Find the next deferred marker for `id` in `html`.
 * Accepts both `attr=""` and boolean `attr` forms from SSR.
 */
export function findDeferredMarker(html: string, id: string): { index: number; length: number } | null {
  const safeId = escapeAttr(id);
  const patterns = [
    `<div data-otok-loading="${safeId}" ${OTOK_DEFERRED_MARKER_ATTR}=""></div>`,
    `<div data-otok-loading="${safeId}" ${OTOK_DEFERRED_MARKER_ATTR}></div>`,
    `<div ${OTOK_DEFERRED_MARKER_ATTR}="" data-otok-loading="${safeId}"></div>`,
    `<div ${OTOK_DEFERRED_MARKER_ATTR} data-otok-loading="${safeId}"></div>`,
  ];
  for (const pattern of patterns) {
    const index = html.indexOf(pattern);
    if (index !== -1) return { index, length: pattern.length };
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
