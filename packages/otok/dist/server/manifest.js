import { readFileSync } from "node:fs";
/**
 * Read the Vite client manifest produced by `vite build --mode client`.
 *
 * @example
 * ```ts
 * const manifest = readOtokManifest(import.meta.url);
 * ```
 */
export function readOtokManifest(moduleUrl, options = {}) {
    const prodOnly = options.prodOnly ?? true;
    const isProd = options.isProd ??
        (typeof import.meta !== "undefined" &&
            !!import.meta.env?.PROD);
    if (prodOnly && !isProd)
        return undefined;
    const manifestUrl = new URL(options.manifestPath ?? "../client/.vite/manifest.json", moduleUrl);
    return JSON.parse(readFileSync(manifestUrl, "utf8"));
}
//# sourceMappingURL=manifest.js.map