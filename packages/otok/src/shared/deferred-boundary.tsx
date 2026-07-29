import { h, type ComponentChildren } from "preact";
import type { DeferredRenderResult } from "../rendering/deferred.js";
import { isDeferredRenderResult } from "../rendering/deferred-resolve.js";
import {
  OTOK_DEFERRED_MARKER_ATTR,
  registerDeferredBoundary,
} from "../rendering/deferred-context.js";
import { OTOK_LOADING_ATTR } from "../rendering/loading.js";

export interface DeferredBoundaryProps<T> {
  /** Deferred slot from `createDeferredSlot`, or already-resolved value. */
  slot: DeferredRenderResult<T> | T;
  /** Optional UI reserved for DX; sequential streaming awaits the slot instead of sending this. */
  fallback?: ComponentChildren;
  children: (value: T) => ComponentChildren;
}

/**
 * SSR loading boundary for deferred loader regions.
 *
 * During the critical render pass this emits a splice marker. The server awaits
 * the slot promise and streams the resolved `children` HTML in document order
 * (zero-JS sequential streaming).
 */
export function DeferredBoundary<T>({ slot, fallback, children }: DeferredBoundaryProps<T>) {
  if (isDeferredRenderResult(slot)) {
    registerDeferredBoundary({
      id: slot.deferred.id,
      promise: slot.deferred.promise,
      fallback,
      render: (value) => children(value as T),
    });
    return h("div", {
      [OTOK_LOADING_ATTR]: slot.deferred.id,
      [OTOK_DEFERRED_MARKER_ATTR]: "",
    });
  }

  return children(slot);
}
