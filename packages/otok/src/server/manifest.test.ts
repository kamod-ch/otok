import { describe, expect, it } from "vitest";
import { resolveOtokManifest } from "./manifest.js";
import type { ViteManifest } from "./html.js";

const sample: ViteManifest = {
  "src/client.ts": {
    file: "assets/client-abc123.js",
    css: ["assets/client-abc123.css"],
    isEntry: true,
  },
};

describe("resolveOtokManifest", () => {
  it("returns the injected manifest in production", () => {
    expect(resolveOtokManifest(sample, { isProd: true })).toEqual(sample);
  });

  it("returns undefined in non-production when prodOnly is true", () => {
    expect(resolveOtokManifest(sample, { isProd: false })).toBeUndefined();
  });

  it("returns undefined for nullish or non-object values", () => {
    expect(resolveOtokManifest(null, { isProd: true })).toBeUndefined();
    expect(resolveOtokManifest(undefined, { isProd: true })).toBeUndefined();
  });
});
