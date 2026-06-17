export interface IslandRenderContext {
    islands: Set<string>;
    nextIslandId: number;
}
export declare function withIslandRenderContext<T>(context: IslandRenderContext, render: () => T): T;
export declare function registerRenderedIsland(id: string): string;
//# sourceMappingURL=island-context.d.ts.map