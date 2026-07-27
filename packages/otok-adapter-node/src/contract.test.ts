import { describe, expect, it } from "vitest";
import { assertAdapterContract } from "otok-adapter-contract";
import node, { nodeOutputDirs } from "./index.js";

describe("otok-adapter-node contract", () => {
  assertAdapterContract({
    adapter: node({ outDir: "dist" }),
    expected: {
      name: "otok-adapter-node",
      runtime: "node",
      capabilities: [
        "node-apis",
        "filesystem",
        "process-env",
        "graceful-shutdown",
        "ssr",
        "streaming",
        "middleware",
        "server-actions",
        "islands",
        "static-assets",
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

  it("uses custom outDir", () => {
    expect(nodeOutputDirs({ outDir: "build" })).toEqual({
      root: "build",
      client: "build/client",
      server: "build/server",
    });
  });
});
