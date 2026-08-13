import { readFileSync } from "node:fs";
import type { ViteManifest } from "./html.js";
import { isOtokProduction } from "./manifest.js";

export interface ReadOtokManifestOptions {
  /** Skip reading when not in production. Defaults to true. */
  prodOnly?: boolean;
  /** Override production detection (defaults to `import.meta.env.PROD`). */
  isProd?: boolean;
  /** Relative path from the server bundle to the client manifest. */
  manifestPath?: string;
}

/**
 * Read the Vite client manifest from disk (`fs`).
 *
 * **Node only.** Do not import this module on Cloudflare Workers / Edge runtimes.
 * On Edge, import the JSON (or load from KV/R2) and pass it through
 * `resolveOtokManifest` into `createOtokWorkerApp({ manifest })`.
 *
 * @example
 * ```ts
 * // Node
 * import { readOtokManifest } from "@kamod-ch/otok/server";
 * const manifest = readOtokManifest(import.meta.url);
 * ```
 */
export function readOtokManifest(
  moduleUrl: string | URL,
  options: ReadOtokManifestOptions = {},
): ViteManifest | undefined {
  const prodOnly = options.prodOnly ?? true;
  if (prodOnly && !isOtokProduction(options.isProd)) return undefined;

  const manifestUrl = new URL(options.manifestPath ?? "../client/.vite/manifest.json", moduleUrl);
  return JSON.parse(readFileSync(manifestUrl, "utf8")) as ViteManifest;
}
