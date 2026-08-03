import fs from "node:fs/promises";
import path from "node:path";

export interface CacheRecord {
  fetchedAt: string;
  index: unknown;
  bundle: unknown;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function defaultCachePath(home = process.env.HOME ?? ""): string {
  return path.join(home, ".cache", "otok", "registry-v1.json");
}

export function projectCachePath(projectRoot: string): string {
  return path.join(projectRoot, ".otok", "cache", "registry-v1.json");
}

export async function readCache(filePath: string): Promise<CacheRecord | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as CacheRecord;
  } catch {
    return null;
  }
}

export async function writeCache(filePath: string, record: CacheRecord): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

export function isCacheFresh(record: CacheRecord, ttlMs = DEFAULT_TTL_MS): boolean {
  const age = Date.now() - new Date(record.fetchedAt).getTime();
  return age >= 0 && age < ttlMs;
}
