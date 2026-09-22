// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreScrollPosition, saveScrollPosition, scrollToHashFromUrl } from "./scroll.js";

afterEach(() => {
  document.body.innerHTML = "";
  window.scrollTo(0, 0);
});

describe("scroll helpers", () => {
  it("restores a saved scroll position for a path key", async () => {
    Object.defineProperty(window, "scrollX", { configurable: true, value: 0, writable: true });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    Object.defineProperty(window, "scrollY", { configurable: true, value: 400, writable: true });
    saveScrollPosition("/projects");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
    restoreScrollPosition("/projects");
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    expect(scrollTo).toHaveBeenCalled();
    const call = scrollTo.mock.calls.at(-1)?.[0] as ScrollToOptions;
    expect(call.top).toBe(400);
  });

  it("scrolls to hash targets from a URL", () => {
    document.body.innerHTML = '<div id="project-name" style="height:200px">x</div>';
    const scrollIntoView = vi.fn();
    const target = document.getElementById("project-name")!;
    target.scrollIntoView = scrollIntoView;

    expect(scrollToHashFromUrl("/projects#project-name")).toBe(true);
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
