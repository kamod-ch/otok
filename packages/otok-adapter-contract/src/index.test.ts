import { describe, expect, it } from "vitest";
import { defineAdapter, resolveAdapter } from "@otok/config";
import { assertAdapterContract } from "./index.js";

const stubAdapter = defineAdapter({
  name: "otok-adapter-stub",
  runtime: "stub",
  capabilities: ["islands"],
  build: { clientEntry: "src/client.ts" },
  outputDirs(_options, _root) {
    return { root: "dist", client: "dist/client" };
  },
});

describe("assertAdapterContract helper", () => {
  assertAdapterContract({
    adapter: stubAdapter(),
    expected: {
      name: "otok-adapter-stub",
      runtime: "stub",
      capabilities: ["islands"],
      outDirs: { root: "dist", client: "dist/client" },
    },
  });

  it("resolveAdapter works with instantiated adapters", () => {
    expect(resolveAdapter(stubAdapter(), "/tmp")?.adapter.name).toBe("otok-adapter-stub");
  });
});
