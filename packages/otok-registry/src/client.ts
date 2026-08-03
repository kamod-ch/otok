import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultCachePath,
  isCacheFresh,
  projectCachePath,
  readCache,
  writeCache,
  type CacheRecord,
} from "./cache.js";
import {
  indexRegistry,
  validateRegistryBundle,
  validateRegistryIndex,
  verifyBundleChecksum,
} from "./validate.js";
import type { LoadedRegistry, RegistryClientOptions } from "./schema.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function bundledRegistryDir(): string {
  const candidates = [
    path.join(packageRoot, "registry", "v1"),
    path.join(packageRoot, "dist", "registry", "v1"),
  ];
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

export async function loadBundledRegistry(): Promise<LoadedRegistry> {
  const dir = bundledRegistryDir();
  const indexRaw = await fs.readFile(path.join(dir, "index.json"), "utf8");
  const bundleRaw = await fs.readFile(path.join(dir, "extensions.json"), "utf8");
  return parseRegistryPayload(indexRaw, bundleRaw);
}

export function parseRegistryPayload(indexRaw: string, bundleRaw: string): LoadedRegistry {
  const index = validateRegistryIndex(JSON.parse(indexRaw));
  if (!verifyBundleChecksum(bundleRaw, index.checksum)) {
    throw new Error("Registry checksum mismatch — bundle may be tampered.");
  }
  const bundle = validateRegistryBundle(JSON.parse(bundleRaw));
  return indexRegistry(index, bundle);
}

export class RegistryClient {
  private loaded: LoadedRegistry | null = null;
  private readonly options: Required<Pick<RegistryClientOptions, "cacheTtlMs">> &
    RegistryClientOptions;

  constructor(options: RegistryClientOptions = {}) {
    this.options = {
      cacheTtlMs: options.cacheTtlMs ?? 24 * 60 * 60 * 1000,
      ...options,
    };
  }

  async load(projectRoot?: string): Promise<LoadedRegistry> {
    if (this.loaded) return this.loaded;

    if (this.options.offline) {
      this.loaded = await this.loadFromCacheOrBundle(projectRoot);
      return this.loaded;
    }

    const cachePaths = [
      projectRoot ? projectCachePath(projectRoot) : undefined,
      this.options.cacheDir,
      defaultCachePath(),
    ].filter(Boolean) as string[];

    for (const cachePath of cachePaths) {
      const cached = await readCache(cachePath);
      if (cached && isCacheFresh(cached, this.options.cacheTtlMs)) {
        this.loaded = parseRegistryPayload(
          JSON.stringify(cached.index),
          JSON.stringify(cached.bundle),
        );
        return this.loaded;
      }
    }

    const url = this.options.registryUrl ?? process.env.OTOK_REGISTRY_URL;
    if (url) {
      try {
        this.loaded = await this.fetchRemote(url);
        await this.persistCache(cachePaths[0] ?? defaultCachePath());
        return this.loaded;
      } catch {
        // fall through to bundled
      }
    }

    this.loaded = await loadBundledRegistry();
    return this.loaded;
  }

  private async loadFromCacheOrBundle(projectRoot?: string): Promise<LoadedRegistry> {
    const cachePath = projectRoot ? projectCachePath(projectRoot) : defaultCachePath();
    const cached = await readCache(cachePath);
    if (cached) {
      return parseRegistryPayload(JSON.stringify(cached.index), JSON.stringify(cached.bundle));
    }
    return loadBundledRegistry();
  }

  private async fetchRemote(baseUrl: string): Promise<LoadedRegistry> {
    const indexRes = await fetch(new URL("index.json", baseUrl).href);
    const bundleRes = await fetch(new URL("extensions.json", baseUrl).href);
    if (!indexRes.ok || !bundleRes.ok) {
      throw new Error(`Failed to fetch registry from ${baseUrl}`);
    }
    const indexRaw = await indexRes.text();
    const bundleRaw = await bundleRes.text();
    return parseRegistryPayload(indexRaw, bundleRaw);
  }

  private async persistCache(cachePath: string): Promise<void> {
    if (!this.loaded) return;
    const record: CacheRecord = {
      fetchedAt: new Date().toISOString(),
      index: {
        schemaVersion: this.loaded.schemaVersion,
        generatedAt: this.loaded.generatedAt,
        checksum: this.loaded.checksum,
        extensionsUrl: this.loaded.extensionsUrl,
        publishers: this.loaded.publishers,
        reviewPolicyUrl: this.loaded.reviewPolicyUrl,
        abuseContact: this.loaded.abuseContact,
      },
      bundle: { schemaVersion: this.loaded.schemaVersion, extensions: this.loaded.extensions },
    };
    await writeCache(cachePath, record);
  }
}

export async function createRegistryClient(options?: RegistryClientOptions): Promise<RegistryClient> {
  return new RegistryClient(options);
}
