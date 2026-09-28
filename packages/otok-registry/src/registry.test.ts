import { describe, expect, it } from "vitest";
import { ExtensionEntrySchema, RegistryBundleSchema, RegistryIndexSchema } from "./schema.js";
import { loadBundledRegistry, parseRegistryPayload } from "./client.js";
import { searchExtensions, resolveExtension, formatExtensionDetail } from "./search.js";
import { checkCompatibility, findOutdated } from "./compatibility.js";
import { sha256Checksum, verifyBundleChecksum } from "./validate.js";
import { satisfiesRange } from "./semver.js";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundledRegistryDir } from "./client.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const packagesDir = path.join(repoRoot, "packages");
const coreVersion = JSON.parse(fsSync.readFileSync(path.join(packagesDir, "otok/package.json"), "utf8"))
  .version as string;

function registryNameToDirectory(name: string): string {
  if (!name.startsWith("@kamod-ch/")) return name;
  return name.slice("@kamod-ch/".length);
}

function githubDocsToLocal(docs: string | undefined): string | undefined {
  if (!docs) return undefined;
  const prefix = "https://github.com/kamod-ch/otok/tree/main/";
  if (!docs.startsWith(prefix)) return undefined;
  return docs.slice(prefix.length);
}

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
    expect(() => parseRegistryPayload(indexRaw, '{"schemaVersion":"1.0.0","extensions":[]}')).toThrow(/checksum/i);
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

describe("bundled registry drift", () => {
  it("matches monorepo manifests for official kamod-ch extensions", async () => {
    const registry = await loadBundledRegistry();
    for (const entry of registry.extensions) {
      if (entry.publisher !== "kamod-ch" || !entry.name.startsWith("@kamod-ch/")) continue;
      const dir = registryNameToDirectory(entry.name);
      const manifestPath = path.join(packagesDir, dir, "package.json");
      expect(fsSync.existsSync(manifestPath), `${entry.name} manifest`).toBe(true);
      const manifest = JSON.parse(fsSync.readFileSync(manifestPath, "utf8"));
      expect(entry.version).toBe(manifest.version);
      expect(satisfiesRange(coreVersion, entry.otokVersion)).toBe(true);
      const localDocs = githubDocsToLocal(entry.docs);
      if (localDocs) {
        expect(fsSync.existsSync(path.join(repoRoot, localDocs)), `${entry.name} docs`).toBe(true);
      }
    }
  });
});

describe("compatibility", () => {
  it("passes for matching otok version", async () => {
    const registry = await loadBundledRegistry();
    const entry = resolveExtension(registry, "kysely")!;
    const result = checkCompatibility(entry, { otokVersion: coreVersion, adapter: "node" });
    expect(result.compatible).toBe(true);
  });

  it("warns on deprecated packages", () => {
    const entry = ExtensionEntrySchema.parse({
      name: "@example/deprecated-plugin",
      description: "Fixture for deprecation warnings.",
      publisher: "kamod-ch",
      tier: "community",
      version: "0.0.1",
      otokVersion: "^0.4.0",
      runtime: ["node"],
      adapters: ["node"],
      capabilities: [],
      license: "MIT",
      maintenanceStatus: "deprecated",
      qualityStatus: "unverified",
      securityNotes: [],
      deprecated: true,
      deprecationMessage: "Use @kamod-ch/otok-events instead.",
      successor: "@kamod-ch/otok-events",
      publishedAt: "2026-01-01T00:00:00.000Z",
      keywords: [],
    });
    const result = checkCompatibility(entry, { otokVersion: "0.4.0" });
    expect(result.warnings.some((w) => /deprecated/i.test(w))).toBe(true);
  });

  it("finds outdated installed versions", async () => {
    const registry = await loadBundledRegistry();
    const outdated = findOutdated({ "@kamod-ch/otok-kysely": "0.9.0" }, registry.extensions);
    expect(outdated[0]?.latest).toBe("1.0.0");
  });
});
