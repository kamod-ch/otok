import { describe, expect, it } from "vitest";
import { createTestApp } from "@otok/test";
import { resolveOtokConfig } from "otok";
import hello from "./index.js";

describe("otok-plugin-hello", () => {
  it("registers the hello API route through configureApp", async () => {
    const resolved = await resolveOtokConfig(
      { plugins: [hello()] },
      { root: "/tmp", mode: "test", command: "build" },
    );

    const app = createTestApp({
      routes: [{ path: "/" }],
      configure: (app) => {
        void resolved.applyAppPlugins(app);
      },
    });

    const response = await app.request("/api/plugin/hello");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "hello from otok-plugin-hello",
    });
  });
});
