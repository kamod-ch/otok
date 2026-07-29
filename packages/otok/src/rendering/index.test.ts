import { describe, expect, it } from "vitest";
import { defineRendering } from "./define.js";
import { resolveRenderPlan } from "./resolve.js";
import { scanRenderingFromSource } from "./scan.js";
import { collectPrerenderEntries } from "./prerender-manifest.js";

describe("defineRendering", () => {
  it("preserves config", () => {
    const rendering = defineRendering({
      mode: "ssr",
      streaming: true,
      cache: { maxAge: 60, tags: ["companies"] },
    });
    expect(rendering.mode).toBe("ssr");
    expect(rendering.__otokRendering).toBe(true);
  });
});

describe("resolveRenderPlan", () => {
  it("resolves ssr with streaming", () => {
    const { plan } = resolveRenderPlan(
      defineRendering({ mode: "ssr", streaming: true }),
      {
        method: "GET",
        pathname: "/companies/acme",
        params: { companyId: "acme" },
        cookies: null,
        hasAuth: false,
        hasSession: false,
        globalStreaming: false,
        adapterCapabilities: new Set(["ssr", "streaming"]),
      },
    );
    expect(plan.mode).toBe("ssr");
    expect(plan.streaming).toBe(true);
  });

  it("forces private cache for authenticated requests", () => {
    const { plan, warnings } = resolveRenderPlan(
      defineRendering({ mode: "ssr", cache: { public: true, maxAge: 60, sMaxAge: 300 } }),
      {
        method: "GET",
        pathname: "/dashboard",
        params: {},
        cookies: "session=abc",
        hasAuth: true,
        hasSession: true,
        globalStreaming: false,
      },
    );
    expect(plan.cache).toMatchObject({ private: true });
    expect(warnings.some((warning) => warning.code === "CACHE_PUBLIC_WITH_AUTH")).toBe(true);
  });

  it("resolves hybrid to ssg for anonymous users", () => {
    const { plan } = resolveRenderPlan(defineRendering({ mode: "hybrid" }), {
      method: "GET",
      pathname: "/about",
      params: {},
      cookies: null,
      hasAuth: false,
      hasSession: false,
      globalStreaming: false,
    });
    expect(plan.mode).toBe("ssg");
  });

  it("resolves client mode", () => {
    const { plan } = resolveRenderPlan(defineRendering({ mode: "client" }), {
      method: "GET",
      pathname: "/app",
      params: {},
      cookies: null,
      hasAuth: false,
      hasSession: false,
      globalStreaming: true,
    });
    expect(plan.mode).toBe("client");
    expect(plan.streaming).toBe(false);
  });
});

describe("scanRenderingFromSource", () => {
  it("reads defineRendering blocks", () => {
    const config = scanRenderingFromSource(`
      export const rendering = defineRendering({
        mode: "ssg",
        prerender: { paths: ["/", "/about"] },
      });
    `);
    expect(config?.mode).toBe("ssg");
  });
});

describe("collectPrerenderEntries", () => {
  it("includes static and dynamic prerender paths", async () => {
    const manifest = await collectPrerenderEntries([
      {
        routePattern: "/",
        routePath: "/",
        file: "index.tsx",
        rendering: { mode: "ssg" },
      },
      {
        routePattern: "/companies/[companyId]",
        routePath: "/companies/:companyId",
        file: "companies/[companyId].tsx",
        rendering: {
          mode: "ssg",
          prerender: { params: { companyId: ["acme", "beta"] } },
        },
      },
    ]);

    expect(manifest.entries.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["/", "/companies/acme", "/companies/beta"]),
    );
  });
});
