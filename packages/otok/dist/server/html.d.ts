import type { OtokHead } from "../shared/routes.js";
export interface ViteManifestEntry {
    file?: string;
    css?: string[];
    imports?: string[];
    isEntry?: boolean;
}
export type ViteManifest = Record<string, ViteManifestEntry>;
export interface PageHtmlOptions {
    body: string;
    head?: OtokHead;
    islands: string[];
    manifest?: ViteManifest;
    clientEntry?: string;
    devClientEntry?: string;
    /** Stylesheet URLs to emit in dev when no Vite manifest is available. */
    devStylesheets?: string[];
    base?: string;
    /** When true, SSR emits `<html class="dark">` from the theme cookie. */
    darkMode?: boolean;
    /** Include theme bootstrap script and color-scheme styles. Defaults to false. */
    theme?: boolean;
}
export declare function pageHtml({ body, head, islands, manifest, clientEntry, devClientEntry, devStylesheets, base, darkMode, theme, }: PageHtmlOptions): string;
//# sourceMappingURL=html.d.ts.map