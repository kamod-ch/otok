import type { ViteManifest } from "./html.js";

export interface ResolveOtokManifestOptions {
  /** Skip resolving when not in production. Defaults to true. */
  prodOnly?: boolean;
  /** Override production detection (defaults to `import.meta.env.PROD`). */
  isProd?: boolean;
}

export function isOtokProduction(isProd?: boolean): boolean {
  return (
    isProd ??
    (typeof import.meta !== "undefined" &&
      !!(import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD)
  );
}

/**
 * Use a Vite manifest that was already loaded (JSON import, KV, R2, etc.).
 *
 * Preferred on Edge/Workers where Node `fs` (`readOtokManifest`) is unavailable.
 *
 * @example
 * ```ts
 * import clientManifest from "../client/.vite/manifest.json";
 * const manifest = resolveOtokManifest(clientManifest, { prodOnly: false });
 * ```
 */
export function resolveOtokManifest(
  manifest: ViteManifest | null | undefined,
  options: ResolveOtokManifestOptions = {},
): ViteManifest | undefined {
  const prodOnly = options.prodOnly ?? true;
  if (prodOnly && !isOtokProduction(options.isProd)) return undefined;
  if (!manifest || typeof manifest !== "object") return undefined;
  return manifest;
}
