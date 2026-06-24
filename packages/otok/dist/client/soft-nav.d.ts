import type { IslandRegistry } from "../shared/islands.js";
export interface SoftNavOptions {
    scroll?: boolean | ScrollBehavior;
    prefetch?: boolean;
    onNavigate?: (detail: {
        url: string;
    }) => void;
    onError?: (error: unknown) => void;
}
export interface SoftNavigateOptions {
    replace?: boolean;
    scroll?: boolean | ScrollBehavior;
}
export declare function isSoftNavLink(anchor: HTMLAnchorElement, location?: Location): boolean;
export declare function syncSoftNavigationHead(nextDoc: Document, currentDoc?: Document): void;
export declare function applySoftNavigationDocument(nextDoc: Document, currentDoc?: Document): boolean;
export declare function prefetchSoftNavUrl(url: string): void;
export declare function softNavigate(url: string, registry: IslandRegistry, options?: SoftNavigateOptions & Pick<SoftNavOptions, "onError">): Promise<boolean>;
export declare function setupSoftNavigation(registry: IslandRegistry, options?: SoftNavOptions): () => void;
//# sourceMappingURL=soft-nav.d.ts.map