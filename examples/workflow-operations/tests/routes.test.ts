import { describe, expect, it } from "vitest";
import { createTestHarness, operatorHeader, seedInstance } from "./helpers.js";

describe("workflow-operations reads", () => {
  it("401 when unauthenticated", async () => {
    const { app } = createTestHarness();
    const res = await app.request("/ops/workflows/instances");
    expect(res.status).toBe(401);
  });

  it("403 when session lacks workflow:read", async () => {
    const { app } = createTestHarness();
    const res = await app.request("/ops/workflows/instances", {
      headers: operatorHeader([]),
    });
    expect(res.status).toBe(403);
  });

  it("lists instances without raw payloads in JSON", async () => {
    const { app, store } = createTestHarness();
    await seedInstance(store, {
      id: "11111111-1111-4111-8111-111111111111",
      workflowName: "demo.wf",
      status: "running",
      input: { password: "secret" },
    });
    const res = await app.request("/ops/workflows/instances", {
      headers: { ...operatorHeader(), accept: "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.instances).toHaveLength(1);
    expect(body.instances[0]).not.toHaveProperty("input");
  });

  it("rejects limit above 100", async () => {
    const { app } = createTestHarness();
    const res = await app.request("/ops/workflows/instances?limit=200", {
      headers: operatorHeader(),
    });
    expect(res.status).toBe(400);
  });

  it("404 for unknown instance detail", async () => {
    const { app } = createTestHarness();
    const res = await app.request("/ops/workflows/instances/00000000-0000-4000-8000-000000000099", {
      headers: operatorHeader(),
    });
    expect(res.status).toBe(404);
  });
});

describe("workflow-operations mutations", () => {
  it("403 without operate permission", async () => {
    const { app, store } = createTestHarness();
    const id = "22222222-2222-4222-8222-222222222222";
    await seedInstance(store, { id, workflowName: "demo.wf", status: "running" });
    const { csrf, cookie } = await fetchCsrfForPost(app);
    const res = await app.request(`/ops/workflows/instances/${id}/pause`, {
      method: "POST",
      headers: {
        ...operatorHeader(["workflow:read"]),
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `_csrf=${csrf}`,
    });
    expect(res.status).toBe(403);
  });

  it("409 pause when completed", async () => {
    const { app, store } = createTestHarness();
    const id = "33333333-3333-4333-8333-333333333333";
    await seedInstance(store, { id, workflowName: "demo.wf", status: "completed" });
    const { csrf, cookie } = await fetchCsrfForPost(app);
    const res = await app.request(`/ops/workflows/instances/${id}/pause`, {
      method: "POST",
      headers: {
        ...operatorHeader(),
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `_csrf=${csrf}`,
    });
    expect(res.status).toBe(409);
  });

  it("pause running instance redirects", async () => {
    const { app, store, audit } = createTestHarness();
    const id = "44444444-4444-4444-8444-444444444444";
    await seedInstance(store, { id, workflowName: "demo.wf", status: "running" });
    const { csrf, cookie } = await fetchCsrfForPost(app);
    const res = await app.request(`/ops/workflows/instances/${id}/pause`, {
      method: "POST",
      headers: {
        ...operatorHeader(),
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `_csrf=${csrf}`,
    });
    expect(res.status).toBe(303);
    const row = await store.getInstance(id);
    expect(row?.status).toBe("paused");
    expect(audit.entries.some((e) => e.action === "pause" && e.result === "ok")).toBe(true);
  });

  it("403 invalid CSRF", async () => {
    const { app, store } = createTestHarness();
    const id = "55555555-5555-4555-8555-555555555555";
    await seedInstance(store, { id, workflowName: "demo.wf", status: "running" });
    const res = await app.request(`/ops/workflows/instances/${id}/pause`, {
      method: "POST",
      headers: {
        ...operatorHeader(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "_csrf=bad",
    });
    expect(res.status).toBe(403);
  });
});

async function fetchCsrfForPost(app: ReturnType<typeof createTestHarness>["app"]) {
  const get = await app.request("/login");
  const setCookie = get.headers.get("set-cookie") ?? "";
  const csrf = setCookie.match(/workflow_ops_csrf=([^;]+)/)?.[1] ?? "";
  const cookie = setCookie.split(";")[0];
  return { csrf, cookie };
}
