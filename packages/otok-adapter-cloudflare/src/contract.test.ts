import { describe, expect, it } from "vitest";
import { assertAdapterContract } from "otok-adapter-contract";
import cloudflare, { cloudflareOutputDirs } from "./index.js";

describe("otok-adapter-cloudflare contract", () => {
  assertAdapterContract({
    adapter: cloudflare({ outDir: "dist" }),
    expected: {
      name: "otok-adapter-cloudflare",
      runtime: "cloudflare",
      capabilities: [
        "ssr",
        "streaming",
        "middleware",
        "server-actions",
        "islands",
        "static-assets",
        "env-bindings",
        "worker-fetch",
      ],
      outDirs: {
        root: "dist",
        client: "dist/client",
        server: "dist/server",
      },
      ssr: { supported: true, streaming: true },
      middleware: { supported: true },
      prerender: { supported: false },
    },
  });
});

describe("otok-adapter-cloudflare outputDirs", () => {
  it("uses custom outDir", () => {
    expect(cloudflareOutputDirs({ outDir: "build" })).toEqual({
      root: "build",
      client: "build/client",
      server: "build/server",
    });
  });
});
