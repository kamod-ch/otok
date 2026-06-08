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
    base?: string;
}
export declare function pageHtml({ body, head, islands, manifest, clientEntry, devClientEntry, base, }: PageHtmlOptions): string;
//# sourceMappingURL=html.d.ts.map