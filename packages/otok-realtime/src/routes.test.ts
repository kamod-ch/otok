import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { configureRealtimeApp } from "./plugin.js";
import { companiesChannel } from "./crm/channels.js";

describe("SSE routes", () => {
  it("returns 401 without auth", async () => {
    const app = new Hono();
    configureRealtimeApp(app, { channels: { companies: companiesChannel } });

    const res = await app.request("/realtime/sse/companies/acme");
    expect(res.status).toBe(401);
  });

  it("rejects query token", async () => {
    const app = new Hono();
    configureRealtimeApp(app, { channels: { companies: companiesChannel } });

    const res = await app.request("/realtime/sse/companies/acme?token=secret");
    expect(res.status).toBe(400);
  });

  it("streams SSE with bearer auth", async () => {
    const app = new Hono();
    configureRealtimeApp(app, { channels: { companies: companiesChannel } });

    const res = await app.request("/realtime/sse/companies/acme", {
      headers: { authorization: "Bearer user:alice" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });
});
