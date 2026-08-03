import { describe, expect, it } from "vitest";
import { definePreset } from "./preset.js";
import { mergePresets } from "./preset-merge.js";

describe("mergePresets", () => {
  const registry = {
    base: definePreset({
      name: "base",
      starter: "minimal",
      files: [{ from: "a.txt", to: "src/a.txt" }],
      packageJson: { dependencies: { otok: "^0.4.0" } },
    }),
    derived: definePreset({
      name: "derived",
      extends: "base",
      files: [{ from: "b.txt", to: "src/b.txt" }],
      overwrite: { "src/a.txt": "replace" },
    }),
    derivedReplace: definePreset({
      name: "derivedReplace",
      extends: "base",
      files: [{ from: "a2.txt", to: "src/a.txt" }],
    }),
  };

  it("merges extends in deterministic order", () => {
    const plan = mergePresets([registry.derived], registry);
    expect(plan.chain).toEqual(["base", "derived"]);
    expect(plan.starter).toBe("minimal");
    expect(plan.files.map((f) => f.to)).toEqual(["src/a.txt", "src/b.txt"]);
  });

  it("applies overwrite replace for conflicting destinations", () => {
    const plan = mergePresets([registry.derivedReplace], registry);
    expect(plan.files.find((f) => f.to === "src/a.txt")?.from).toBe("a2.txt");
  });

  it("merges package.json patches", () => {
    const plan = mergePresets(
      [
        registry.base,
        definePreset({
          name: "x",
          packageJson: { devDependencies: { vitest: "^4.0.0" } },
        }),
      ],
      registry,
    );
    expect(plan.packageJson.dependencies.otok).toBe("^0.4.0");
    expect(plan.packageJson.devDependencies.vitest).toBe("^4.0.0");
  });
});
