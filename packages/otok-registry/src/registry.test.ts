import { describe, expect, it } from "vitest";
import {
  ExtensionEntrySchema,
  RegistryBundleSchema,
  RegistryIndexSchema,
} from "./schema.js";
import { loadBundledRegistry, parseRegistryPayload } from "./client.js";
import { searchExtensions, resolveExtension, formatExtensionDetail } from "./search.js";
import { checkCompatibility, findOutdated } from "./compatibility.js";
import { sha256Checksum, verifyBundleChecksum } from "./validate.js";
import fs from "node:fs/promises";
import path from "node:path";
import { bundledRegistryDir } from "./client.js";

describe("registry schema", () => {
  it("validates bundled index and extensions", async () => {
    const dir = bundledRegistryDir();
    const index = JSON.parse(await fs.readFile(path.join(dir, "index.json"), "utf8"));
    const bundle = JSON.parse(await fs.readFile(path.join(dir, "extensions.json"), "utf8"));
    expect(() => RegistryIndexSchema.parse(index)).not.toThrow();
    expect(() => RegistryBundleSchema.parse(bundle)).not.toThrow();
    for (const ext of bundle.extensions) {
      expect(() => ExtensionEntrySchema.parse(ext)).not.toThrow();
    }
  });

  it("verifies checksum integrity", async () => {
    const dir = bundledRegistryDir();
    const indexRaw = await fs.readFile(path.join(dir, "index.json"), "utf8");
    const bundleRaw = await fs.readFile(path.join(dir, "extensions.json"), "utf8");
    const index = RegistryIndexSchema.parse(JSON.parse(indexRaw));
    expect(verifyBundleChecksum(bundleRaw, index.checksum)).toBe(true);
    expect(sha256Checksum(bundleRaw)).toBe(index.checksum);
  });

  it("rejects tampered bundle", async () => {
    const dir = bundledRegistryDir();
    const indexRaw = await fs.readFile(path.join(dir, "index.json"), "utf8");
    expect(() => parseRegistryPayload(indexRaw, '{"schemaVersion":"1.0.0","extensions":[]}')).toThrow(
      /checksum/i,
    );
  });
});

describe("registry search", () => {
  it("finds storage-related extensions offline", async () => {
    const registry = await loadBundledRegistry();
    const results = searchExtensions(registry, { q: "storage" });
    expect(results.some((e) => e.name === "@kamod-ch/otok-storage")).toBe(true);
    expect(results.some((e) => e.name === "@kamod-ch/otok-kysely")).toBe(true);
  });

  it("resolves aliases", async () => {
    const registry = await loadBundledRegistry();
    const entry = resolveExtension(registry, "kysely");
    expect(entry?.name).toBe("@kamod-ch/otok-kysely");
  });

  it("formats detail view", async () => {
    const registry = await loadBundledRegistry();
    const entry = resolveExtension(registry, "otok-kysely")!;
    const detail = formatExtensionDetail(entry, registry);
    expect(detail).toContain("@kamod-ch/otok-kysely");
    expect(detail).toContain("verified");
  });
});

describe("compatibility", () => {
  it("passes for matching otok version", async () => {
    const registry = await loadBundledRegistry();
    const entry = resolveExtension(registry, "kysely")!;
    const result = checkCompatibility(entry, { otokVersion: "0.4.5", adapter: "node" });
    expect(result.compatible).toBe(true);
  });

  it("warns on deprecated packages", async () => {
    const registry = await loadBundledRegistry();
    const entry = resolveExtension(registry, "legacy-bridge")!;
    const result = checkCompatibility(entry, { otokVersion: "0.4.0" });
    expect(result.warnings.some((w) => /deprecated/i.test(w))).toBe(true);
  });

  it("finds outdated installed versions", async () => {
    const registry = await loadBundledRegistry();
    const outdated = findOutdated(
      { "@kamod-ch/otok-kysely": "0.9.0" },
      registry.extensions,
    );
    expect(outdated[0]?.latest).toBe("1.0.0");
  });
});
