// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "preact/test-utils";
import { OTOK_CANCEL_HYDRATION } from "../shared/navigation.js";
import {
  beginHydrationNavigation,
  cancelPendingHydration,
  hydrateIslands,
  hydrateIslandsDeferred,
  hydrateIslandsEager,
  unmountHydratedIslands,
} from "./hydration.js";

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

afterEach(() => {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("hydrateIslands", () => {
  it("clears idle timeout fallback when hydration is cancelled", async () => {
    let scheduled: (() => void) | undefined;
    const timeoutId = 123 as unknown as ReturnType<typeof setTimeout>;
    const clearTimeoutMock = vi.fn();
    globalThis.setTimeout = ((callback: () => void) => {
      scheduled = callback;
      return timeoutId;
    }) as typeof setTimeout;
    globalThis.clearTimeout = clearTimeoutMock as unknown as typeof clearTimeout;

    document.body.innerHTML = '<div data-otok-island="Counter" data-otok-strategy="idle"></div>';
    const element = document.querySelector("[data-otok-island]")!;
    const load = vi.fn(async () => ({ default: () => null }));

    const hydration = hydrateIslands(document, { Counter: load });
    element.dispatchEvent(new Event(OTOK_CANCEL_HYDRATION));
    await hydration;

    expect(clearTimeoutMock).toHaveBeenCalledWith(timeoutId);
    expect(load).not.toHaveBeenCalled();
    scheduled?.();
    expect(load).not.toHaveBeenCalled();
  });

  it("resolves idle scheduling promise when cancelPendingHydration runs", async () => {
    globalThis.setTimeout = ((callback: () => void) => {
      return originalSetTimeout(callback, 60_000);
    }) as typeof setTimeout;

    document.body.innerHTML = '<div data-otok-island="Counter" data-otok-strategy="idle"></div>';
    const load = vi.fn(async () => ({ default: () => null }));

    const hydration = hydrateIslands(document, { Counter: load });
    cancelPendingHydration(document);
    await hydration;

    expect(load).not.toHaveBeenCalled();
  });

  it("does not hydrate after navigation generation advances", async () => {
    document.body.innerHTML = '<div data-otok-island="Counter" data-otok-strategy="load"></div>';
    let resolveLoad: (() => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<{ default: () => null }>((resolve) => {
          resolveLoad = () => resolve({ default: () => null });
        }),
    );

    const gen = beginHydrationNavigation();
    const hydration = hydrateIslandsEager(document, { Counter: load }, { navigationGeneration: gen });
    beginHydrationNavigation();
    resolveLoad?.();
    await hydration;

    expect(load).toHaveBeenCalled();
    expect(document.querySelector("[data-otok-island]")?.getAttribute("data-otok-hydrated")).not.toBe("true");
  });

  it("skips nested island markers (outermost only)", async () => {
    document.body.innerHTML = `
      <div data-otok-island="Outer" data-otok-strategy="load">
        <div data-otok-island="Inner" data-otok-strategy="load"></div>
      </div>
    `;
    const outerLoad = vi.fn(async () => ({ default: () => null }));
    const innerLoad = vi.fn(async () => ({ default: () => null }));

    await hydrateIslands(document, { Outer: outerLoad, Inner: innerLoad });

    expect(outerLoad).toHaveBeenCalledTimes(1);
    expect(innerLoad).not.toHaveBeenCalled();
  });

  it("runs Preact effect cleanup when unmounting a hydrated island", async () => {
    const cleanups = { n: 0 };
    const { h } = await import("preact");
    const { useEffect } = await import("preact/hooks");
    function Probe() {
      useEffect(() => {
        return () => {
          cleanups.n += 1;
        };
      }, []);
      return h("span", null, "probe");
    }

    document.body.innerHTML = '<div data-otok-island="Probe" data-otok-props="e30"></div>';
    await act(async () => {
      await hydrateIslands(document, { Probe: async () => ({ default: Probe }) });
    });
    const root = document.querySelector("[data-otok-island]")!;
    expect(root.getAttribute("data-otok-hydrated")).toBe("true");

    await act(async () => {
      unmountHydratedIslands(document);
    });
    expect(cleanups.n).toBe(1);
  });

  it("unmounts hydrated roots and clears the hydrated marker", () => {
    document.body.innerHTML =
      '<div data-otok-island="Counter" data-otok-hydrated="true"><span id="child">x</span></div>';
    unmountHydratedIslands(document);
    expect(document.querySelector("[data-otok-island]")?.getAttribute("data-otok-hydrated")).toBeNull();
  });

  it("eager pass skips idle islands; deferred pass schedules them", async () => {
    document.body.innerHTML = `
      <div data-otok-island="Now" data-otok-strategy="load"></div>
      <div data-otok-island="Later" data-otok-strategy="idle"></div>
    `;
    const nowLoad = vi.fn(async () => ({ default: () => null }));
    const laterLoad = vi.fn(async () => ({ default: () => null }));

    globalThis.setTimeout = ((callback: () => void) => originalSetTimeout(callback, 0)) as typeof setTimeout;

    await hydrateIslandsEager(document, { Now: nowLoad, Later: laterLoad });
    expect(nowLoad).toHaveBeenCalledTimes(1);
    expect(laterLoad).not.toHaveBeenCalled();

    await hydrateIslandsDeferred(document, { Now: nowLoad, Later: laterLoad });
    await new Promise((r) => originalSetTimeout(r, 5));
    expect(laterLoad).toHaveBeenCalledTimes(1);
  });

  it("settles media scheduling when cancelled before query matches", async () => {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    document.body.innerHTML =
      '<div data-otok-island="Counter" data-otok-strategy="media" data-otok-media="(max-width: 1px)"></div>';
    const load = vi.fn(async () => ({ default: () => null }));

    const hydration = hydrateIslands(document, { Counter: load });
    cancelPendingHydration(document);
    await hydration;

    expect(load).not.toHaveBeenCalled();
  });

  it("reports import errors through onError and still settles scheduling", async () => {
    document.body.innerHTML = '<div data-otok-island="Counter" data-otok-strategy="load"></div>';
    const onError = vi.fn();
    const load = vi.fn(async () => {
      throw new Error("chunk failed");
    });

    await hydrateIslands(document, { Counter: load }, onError);

    expect(onError).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
  });
});
