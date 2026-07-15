// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { OTOK_CANCEL_HYDRATION } from "../shared/navigation.js";
import { hydrateIslands } from "./hydration.js";

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
});
