import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertAdapterCapability, resolveAdapter } from "@otok/config";
import { assertAdapterContract, expectMissingCapability } from "otok-adapter-contract";
import staticAdapter, { collectPrerenderPaths, staticOutputDirs } from "./index.js";

describe("otok-adapter-static contract", () => {
  assertAdapterContract({
    adapter: staticAdapter({ outDir: "dist" }),
    expected: {
      name: "otok-adapter-static",
      runtime: "static",
      capabilities: ["prerender", "islands", "static-assets"],
      outDirs: {
        root: "dist",
        client: "dist/client",
        server: "dist/server",
        static: "dist",
      },
      ssr: { supported: false },
      middleware: { supported: false },
      prerender: { supported: true, strict: true },
    },
  });

  it("rejects node-apis for plugins", () => {
    expectMissingCapability(staticAdapter(), "node-apis", "Filesystem cache plugin");
  });
});

describe("collectPrerenderPaths", () => {
  it("collects index and nested static routes", async () => {
    const routesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/routes");
    const routes = await collectPrerenderPaths(routesDir);
    expect(routes).toContain("/");
    expect(routes).toContain("/about");
  });
});

describe("capability checks", () => {
  it("throws when static adapter lacks ssr", () => {
    const resolved = resolveAdapter(() => staticAdapter(), "/tmp");
    expect(() => assertAdapterCapability(resolved, "ssr", "Needs SSR")).toThrow('Requires capability "ssr"');
  });
});
