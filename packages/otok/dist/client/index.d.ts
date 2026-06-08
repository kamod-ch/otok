import { h, type ComponentType } from "preact";
import { type IslandProps, type IslandRegistry } from "../shared/islands.js";
export interface IslandComponentProps<Props extends IslandProps = IslandProps> {
    component: ComponentType<Props>;
    props?: Props;
    id?: string;
}
declare global {
    interface Window {
        __OTOK_ISLANDS__?: IslandRegistry;
    }
}
export declare function Island<Props extends IslandProps = IslandProps>({ component: Component, props, id, }: IslandComponentProps<Props>): h.JSX.Element;
export interface CreateOtokClientOptions {
    registry?: IslandRegistry;
    root?: ParentNode;
    onError?: (error: unknown, element: Element) => void;
}
export declare function createOtokClient(options?: CreateOtokClientOptions): void;
export type { InferIslandProps } from "../shared/routes.js";
export type { IslandProps, IslandRegistry } from "../shared/islands.js";
//# sourceMappingURL=index.d.ts.map