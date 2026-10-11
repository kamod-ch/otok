// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  restoreScrollPosition,
  saveScrollPosition,
  scrollToHashFromUrl,
  withViewTransition,
} from "./scroll.js";

type TransitionHandles = {
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
  resolveUpdate: () => void;
  rejectUpdate: (error: unknown) => void;
  resolveFinished: () => void;
  rejectFinished: (error: unknown) => void;
};

function installViewTransitionMock(options?: { deferCallbackMs?: number }) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => {
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  };

  const handles: TransitionHandles[] = [];

  doc.startViewTransition = vi.fn((cb: () => void | Promise<void>) => {
    let resolveUpdate!: () => void;
    let rejectUpdate!: (error: unknown) => void;
    let resolveFinished!: () => void;
    let rejectFinished!: (error: unknown) => void;

    const updateCallbackDone = new Promise<void>((resolve, reject) => {
      resolveUpdate = resolve;
      rejectUpdate = reject;
    });
    const finished = new Promise<void>((resolve, reject) => {
      resolveFinished = resolve;
      rejectFinished = reject;
    });

    const run = () => {
      Promise.resolve()
        .then(cb)
        .then(() => resolveUpdate())
        .catch((error) => rejectUpdate(error));
    };

    if (options?.deferCallbackMs && options.deferCallbackMs > 0) {
      setTimeout(run, options.deferCallbackMs);
    } else {
      queueMicrotask(run);
    }

    const entry = {
      updateCallbackDone,
      finished,
      resolveUpdate,
      rejectUpdate,
      resolveFinished,
      rejectFinished,
    };
    handles.push(entry);
    return {
      updateCallbackDone,
      finished,
      ready: Promise.resolve(),
      types: new Set<string>(),
      skipTransition: () => {},
    };
  }) as Document["startViewTransition"];

  return {
    handles,
    restore: () => {
      Reflect.deleteProperty(doc, "startViewTransition");
    },
  };
}

describe("scroll helpers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.scrollTo(0, 0);
  });

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

describe("withViewTransition", () => {
  let matchMediaRestore: typeof window.matchMedia | undefined;

  beforeEach(() => {
    matchMediaRestore = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
  });

  afterEach(() => {
    if (matchMediaRestore) window.matchMedia = matchMediaRestore;
    Reflect.deleteProperty(document, "startViewTransition");
    vi.restoreAllMocks();
  });

  it("waits for a deferred update callback before finishing", async () => {
    const mock = installViewTransitionMock({ deferCallbackMs: 5 });
    let updateDone = false;
    const update = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      updateDone = true;
    });

    const pending = withViewTransition(update);
    expect(updateDone).toBe(false);
    await new Promise((r) => setTimeout(r, 25));
    expect(updateDone).toBe(true);
    mock.handles[0]!.resolveFinished();
    await pending;
    expect(updateDone).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    mock.restore();
  });

  it("rejects when the async update fails", async () => {
    const mock = installViewTransitionMock();
    const boom = new Error("update failed");
    await expect(
      withViewTransition(async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    mock.restore();
  });

  it("rejects when the sync update throws", async () => {
    const mock = installViewTransitionMock();
    const boom = new Error("sync fail");
    await expect(
      withViewTransition(() => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    mock.restore();
  });

  it("tolerates AbortError on finished after a successful update", async () => {
    const mock = installViewTransitionMock();
    const pending = withViewTransition(async () => {});
    await mock.handles[0]!.updateCallbackDone;
    mock.handles[0]!.rejectFinished(new DOMException("aborted", "AbortError"));
    await expect(pending).resolves.toBeUndefined();
    mock.restore();
  });

  it("tolerates TimeoutError on finished after a successful update", async () => {
    const mock = installViewTransitionMock();
    const pending = withViewTransition(async () => {});
    await mock.handles[0]!.updateCallbackDone;
    mock.handles[0]!.rejectFinished(new DOMException("timeout", "TimeoutError"));
    await expect(pending).resolves.toBeUndefined();
    mock.restore();
  });

  it("rejects unexpected animation errors after a successful update", async () => {
    const mock = installViewTransitionMock();
    const pending = withViewTransition(async () => {});
    await mock.handles[0]!.updateCallbackDone;
    const err = new DOMException("broken", "NotAllowedError");
    mock.handles[0]!.rejectFinished(err);
    await expect(pending).rejects.toBe(err);
    mock.restore();
  });

  it("falls back to direct update when API is missing", async () => {
    const update = vi.fn();
    await withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("skips transitions when reduced motion is preferred", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    const mock = installViewTransitionMock();
    const update = vi.fn();
    await withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(mock.handles).toHaveLength(0);
    mock.restore();
  });

  it("rejects when startViewTransition throws synchronously", async () => {
    const doc = document as Document & {
      startViewTransition: (cb: () => void) => unknown;
    };
    doc.startViewTransition = vi.fn(() => {
      throw new Error("vt unsupported");
    });
    await expect(withViewTransition(async () => {})).rejects.toThrow("vt unsupported");
  });
});
