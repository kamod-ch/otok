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
export declare function readOtokManifest(moduleUrl: string | URL, options?: ReadOtokManifestOptions): ViteManifest | undefined;
//# sourceMappingURL=manifest.d.ts.map