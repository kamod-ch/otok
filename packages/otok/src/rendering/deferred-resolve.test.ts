import { describe, expect, it } from "vitest";
import { createDeferredSlot, OTOK_DEFERRED } from "./deferred.js";
import {
  collectDeferredSlots,
  hasDeferredSlots,
  isDeferredRenderResult,
  resolveDeferredData,
  unwrapImmediateData,
} from "./deferred-resolve.js";
import { deferredMarkerHtml, splitHtmlAtDeferredMarkers } from "./deferred-context.js";
import { resolveRenderPlan } from "./resolve.js";
import { defineRendering } from "./define.js";

describe("createDeferredSlot", () => {
  it("marks results with the internal symbol and starts the promise", async () => {
    const slot = createDeferredSlot("posts", async () => ({ count: 2 }), { pending: true });
    expect(slot[OTOK_DEFERRED]).toBe(true);
    expect(isDeferredRenderResult(slot)).toBe(true);
    expect(slot.immediate).toEqual({ pending: true });
    expect(slot.deferred.id).toBe("posts");
    await expect(slot.deferred.promise).resolves.toEqual({ count: 2 });
  });
});

describe("deferred-resolve", () => {
  it("collects nested deferred slots", () => {
    const posts = createDeferredSlot("posts", async () => []);
    const comments = createDeferredSlot("comments", async () => []);
    const data = { user: "alice", feed: { posts, meta: { comments } } };
    expect(collectDeferredSlots(data).map((slot) => slot.id)).toEqual(["posts", "comments"]);
    expect(hasDeferredSlots(data)).toBe(true);
  });

  it("unwraps immediate placeholders without awaiting", () => {
    const posts = createDeferredSlot("posts", () => new Promise(() => {}), null);
    const data = { user: "alice", posts };
    expect(unwrapImmediateData(data)).toEqual({ user: "alice", posts: null });
  });

  it("resolves deferred data in place", async () => {
    const posts = createDeferredSlot("posts", async () => [{ id: 1 }]);
    const data = { user: "alice", posts };
    await expect(resolveDeferredData(data)).resolves.toEqual({
      user: "alice",
      posts: [{ id: 1 }],
    });
  });
});

describe("splitHtmlAtDeferredMarkers", () => {
  it("splits critical HTML around markers in order", () => {
    const html = `before${deferredMarkerHtml("a")}mid${deferredMarkerHtml("b")}after`;
    const { segments, ids } = splitHtmlAtDeferredMarkers(html, ["a", "b"]);
    expect(ids).toEqual(["a", "b"]);
    expect(segments).toEqual(["before", "mid", "after"]);
  });
});

describe("DEFERRED_WITHOUT_STREAMING warning", () => {
  it("warns when deferred is enabled without streaming", () => {
    const { warnings, plan } = resolveRenderPlan(defineRendering({ mode: "ssr", deferred: true, streaming: false }), {
      method: "GET",
      pathname: "/dashboard",
      params: {},
      cookies: null,
      hasAuth: false,
      hasSession: false,
      globalStreaming: false,
    });
    expect(plan.deferred).toBe(true);
    expect(plan.streaming).toBe(false);
    expect(warnings.some((warning) => warning.code === "DEFERRED_WITHOUT_STREAMING")).toBe(true);
  });
});
