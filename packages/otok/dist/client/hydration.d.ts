import { type IslandRegistry } from "../shared/islands.js";
export declare function cancelPendingHydration(root: ParentNode): void;
export declare function hydrateIsland(element: Element, registry: IslandRegistry, onError?: (error: unknown, element: Element) => void): Promise<void>;
export declare function hydrateIslands(root: ParentNode, registry: IslandRegistry, onError?: (error: unknown, element: Element) => void): Promise<void[]>;
//# sourceMappingURL=hydration.d.ts.map