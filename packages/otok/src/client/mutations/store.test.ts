import { describe, expect, it } from "vitest";
import { mutationStore } from "./store.js";

describe("mutationStore", () => {
  it("tracks fetcher state transitions", () => {
    const key = "test:fetcher";
    mutationStore.setMutation(key, { key, state: "submitting" });
    expect(mutationStore.getMutation(key)?.state).toBe("submitting");

    mutationStore.setMutation(key, { key, state: "idle", data: { ok: true } });
    expect(mutationStore.getMutation(key)?.state).toBe("idle");
    expect(mutationStore.getMutation(key)?.data).toEqual({ ok: true });
  });

  it("applies and rolls back optimistic patches", () => {
    mutationStore.setLoaderData("/crm", { companies: [{ id: "1", name: "A" }] });
    mutationStore.applyOptimistic("/crm", { companies: [{ id: "1", name: "B" }] });
    expect(mutationStore.getLoaderData("/crm")).toEqual({ companies: [{ id: "1", name: "B" }] });

    mutationStore.rollbackOptimistic("/crm");
    expect(mutationStore.getLoaderData("/crm")).toEqual({ companies: [{ id: "1", name: "A" }] });
  });

  it("blocks double submit within the window", () => {
    const key = "double";
    expect(mutationStore.isDoubleSubmit(key)).toBe(false);
    expect(mutationStore.isDoubleSubmit(key)).toBe(true);
  });

  it("invalidates loader cache by tags", () => {
    mutationStore.setLoaderData("/a", { x: 1 }, ["companies"]);
    mutationStore.setLoaderData("/b", { y: 2 }, ["users"]);
    mutationStore.invalidateTags(["companies"]);
    expect(mutationStore.getLoaderData("/a")).toBeUndefined();
    expect(mutationStore.getLoaderData("/b")).toEqual({ y: 2 });
  });
});
