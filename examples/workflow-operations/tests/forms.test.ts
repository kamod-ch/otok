import { describe, expect, it } from "vitest";
import { createTestHarness, operatorHeader, seedInstance } from "./helpers.js";

describe("no-JS HTML forms", () => {
  it("detail page includes pause form for running instance", async () => {
    const { app, store } = createTestHarness();
    const id = "66666666-6666-4666-8666-666666666666";
    await seedInstance(store, { id, workflowName: "demo.wf", status: "running" });
    const loginPage = await app.request("/login");
    const cookie = loginPage.headers.get("set-cookie")?.split(";")[0] ?? "";
    const res = await app.request(`/ops/workflows/instances/${id}`, {
      headers: { ...operatorHeader(), cookie },
    });
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('method="post"');
    expect(html).toContain("/pause");
    expect(html).not.toContain("password");
  });

  it("approve requires confirm field", async () => {
    const { app, store } = createTestHarness();
    const id = "77777777-7777-4777-8777-777777777777";
    await seedInstance(store, {
      id,
      workflowName: "demo.wf",
      status: "waiting_approval",
      currentStep: "approval-step",
    });
    const { csrf, cookie } = await csrfFromLogin(app);
    const res = await app.request(`/ops/workflows/instances/${id}/approve`, {
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
});

async function csrfFromLogin(app: ReturnType<typeof createTestHarness>["app"]) {
  const get = await app.request("/login");
  const setCookie = get.headers.get("set-cookie") ?? "";
  return {
    csrf: setCookie.match(/workflow_ops_csrf=([^;]+)/)?.[1] ?? "",
    cookie: setCookie.split(";")[0],
  };
}
