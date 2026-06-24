import { readFileSync } from "node:fs";
import type { ViteManifest } from "./html.js";

export interface ReadOtokManifestOptions {
  /** Skip reading when not in production. Defaults to true. */
  prodOnly?: boolean;
  /** Override production detection (defaults to `import.meta.env.PROD`). */
  isProd?: boolean;
  /** Relative path from the server bundle to the client manifest. */
  manifestPath?: string;
}

/**
 * Read the Vite client manifest produced by `vite build --mode client`.
 *
 * @example
 * ```ts
 * const manifest = readOtokManifest(import.meta.url);
 * ```
 */
export function readOtokManifest(
  moduleUrl: string | URL,
  options: ReadOtokManifestOptions = {},
): ViteManifest | undefined {
  const prodOnly = options.prodOnly ?? true;
  const isProd =
    options.isProd ??
    (typeof import.meta !== "undefined" &&
      !!(import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD);

  if (prodOnly && !isProd) return undefined;

  const manifestUrl = new URL(options.manifestPath ?? "../client/.vite/manifest.json", moduleUrl);
  return JSON.parse(readFileSync(manifestUrl, "utf8")) as ViteManifest;
}
