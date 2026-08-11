import { describe } from "vitest";
import { assertPluginContract } from "./index.js";
import fixture from "@kamod-ch/otok-plugin-fixture";

describe("@kamod-ch/otok-plugin-fixture contract", () => {
  assertPluginContract({
    plugin: fixture,
    expected: {
      name: "otok-plugin-fixture",
      hooks: ["config", "configResolved", "configureVite", "configureApp"],
      virtualModules: ["meta"],
      envKeys: ["fixturePrefix"],
    },
    pluginOptions: { prefix: "test" },
  });
});
