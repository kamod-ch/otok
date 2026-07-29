import { OTOK_DEFERRED, type DeferredRenderResult, type DeferredSlot } from "./deferred.js";

export function isDeferredRenderResult(value: unknown): value is DeferredRenderResult<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    OTOK_DEFERRED in value &&
    (value as DeferredRenderResult<unknown>)[OTOK_DEFERRED] === true &&
    typeof (value as DeferredRenderResult<unknown>).deferred === "object" &&
    (value as DeferredRenderResult<unknown>).deferred !== null &&
    typeof (value as DeferredRenderResult<unknown>).deferred.id === "string" &&
    (value as DeferredRenderResult<unknown>).deferred.promise instanceof Promise
  );
}

/** Collect deferred slots in depth-first object/array walk order. */
export function collectDeferredSlots(data: unknown): DeferredSlot<unknown>[] {
  const slots: DeferredSlot<unknown>[] = [];
  const seen = new Set<DeferredSlot<unknown>>();

  const visit = (value: unknown): void => {
    if (isDeferredRenderResult(value)) {
      if (!seen.has(value.deferred)) {
        seen.add(value.deferred);
        slots.push(value.deferred);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value === "object" && value !== null) {
      for (const child of Object.values(value)) visit(child);
    }
  };

  visit(data);
  return slots;
}

export function hasDeferredSlots(data: unknown): boolean {
  return collectDeferredSlots(data).length > 0;
}

/**
 * Replace deferred fields with their `immediate` placeholders so the first
 * render pass never awaits nested slot promises.
 */
export function unwrapImmediateData<T>(data: T): T {
  return unwrap(data) as T;
}

function unwrap(value: unknown): unknown {
  if (isDeferredRenderResult(value)) {
    return value.immediate;
  }
  if (Array.isArray(value)) {
    return value.map(unwrap);
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = unwrap(child);
    }
    return out;
  }
  return value;
}

/**
 * Await every deferred slot and rewrite the data tree with resolved values.
 * Used when streaming is disabled but deferred slots are present.
 */
export async function resolveDeferredData<T>(data: T, signal?: AbortSignal): Promise<T> {
  const slots = collectDeferredSlots(data);
  if (slots.length === 0) return data;

  const resolved = new Map<DeferredSlot<unknown>, unknown>();
  await Promise.all(
    slots.map(async (slot) => {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      resolved.set(slot, await slot.promise);
    }),
  );

  return replaceResolved(data, resolved) as T;
}

function replaceResolved(value: unknown, resolved: Map<DeferredSlot<unknown>, unknown>): unknown {
  if (isDeferredRenderResult(value)) {
    return resolved.get(value.deferred);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceResolved(item, resolved));
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = replaceResolved(child, resolved);
    }
    return out;
  }
  return value;
}
