import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { resolveOtokConfig } from "@kamod-ch/otok";
import hello from "./index.js";

describe("otok-plugin-hello", () => {
  it("registers the hello API route through configureApp", async () => {
    const resolved = await resolveOtokConfig({ plugins: [hello()] }, { root: "/tmp", mode: "test", command: "build" });

    const app = new Hono();
    await resolved.applyAppPlugins(app);

    const response = await app.request("/api/plugin/hello");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "hello from otok-plugin-hello",
    });
  });
});
