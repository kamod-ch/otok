import { describe, expect, it, afterEach } from "vitest";
import { h } from "preact";
import { createTestApp, renderRoute } from "@kamod-ch/otok-test";
import {
  createOtokDevtoolsBridge,
  getOtokDevtoolsBridge,
  setOtokDevtoolsBridge,
} from "@kamod-ch/otok/devtools";
import devtools from "./index.js";

describe("@kamod-ch/otok-devtools", () => {
  afterEach(() => {
    setOtokDevtoolsBridge(null);
  });

  it("registers the devtools API route in development mode", async () => {
    setOtokDevtoolsBridge(createOtokDevtoolsBridge());

    const resolved = await import("@kamod-ch/otok").then(({ resolveOtokConfig }) =>
      resolveOtokConfig(
        { plugins: [devtools()] },
        { root: "/tmp/otok-devtools-test", mode: "development", command: "serve" },
      ),
    );

    const app = createTestApp({
      routes: [{ path: "/", component: () => h("p", null, "Home") }],
      configure: (app) => {
        void resolved.applyAppPlugins(app);
      },
    });

    const response = await app.request("/__otok_devtools");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.enabled).toBe(true);
    expect(Array.isArray(payload.snapshot.routes)).toBe(true);
  });

  it("records request snapshots when the bridge is active", async () => {
    setOtokDevtoolsBridge(createOtokDevtoolsBridge());
    const app = createTestApp({
      routes: [{ path: "/", component: () => h("p", null, "Home"), loader: () => ({ ok: true }) }],
    });

    await renderRoute(app, "/");
    const snapshot = getOtokDevtoolsBridge()?.getSnapshot();
    expect(snapshot?.requests).toHaveLength(1);
    expect(snapshot?.requests[0]?.status).toBe(200);
    expect(snapshot?.routes[0]?.path).toBe("/");
  });

  it("does not register routes in production mode", async () => {
    const resolved = await import("@kamod-ch/otok").then(({ resolveOtokConfig }) =>
      resolveOtokConfig(
        { plugins: [devtools()] },
        { root: "/tmp/otok-devtools-test", mode: "production", command: "build" },
      ),
    );

    const app = createTestApp({
      routes: [{ path: "/", component: () => h("p", null, "Home") }],
      configure: (app) => {
        void resolved.applyAppPlugins(app);
      },
    });

    const response = await app.request("/__otok_devtools");
    expect(response.status).toBe(404);
  });
});

describe("production exclusion", () => {
  it("exports a dev-only vite plugin factory", async () => {
    const mod = await import("./vite/plugin.js");
    const plugin = mod.createDevtoolsVitePlugin({ endpoint: "/__otok_devtools", panel: true });
    expect(plugin.apply).toBe("serve");
  });
});
