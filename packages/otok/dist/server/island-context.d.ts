export interface IslandRenderContext {
    islands: Set<string>;
}
export declare function withIslandRenderContext<T>(context: IslandRenderContext, render: () => T): T;
export declare function registerRenderedIsland(id: string): void;
//# sourceMappingURL=island-context.d.ts.map