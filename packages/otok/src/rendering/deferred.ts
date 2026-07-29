/** Internal marker for reliable deferred-slot detection (not JSON-serializable). */
export const OTOK_DEFERRED = Symbol.for("otok.deferred");

export interface DeferredSlot<T> {
  id: string;
  promise: Promise<T>;
}

export interface DeferredRenderResult<T> {
  readonly [OTOK_DEFERRED]: true;
  immediate: unknown;
  deferred: DeferredSlot<T>;
}

/**
 * Start a non-critical loader region that can resolve after the HTML shell streams.
 *
 * @param id - Stable slot id used by loading boundaries / stream splicing
 * @param factory - Async work; starts immediately when this function is called
 * @param immediate - Optional placeholder value exposed to the first render pass
 */
export function createDeferredSlot<T>(
  id: string,
  factory: () => Promise<T>,
  immediate?: unknown,
): DeferredRenderResult<T> {
  return {
    [OTOK_DEFERRED]: true,
    immediate,
    deferred: {
      id,
      promise: factory(),
    },
  };
}
