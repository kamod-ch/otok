export interface IslandRenderContext {
  islands: Set<string>;
}

let activeContext: IslandRenderContext | undefined;

export function withIslandRenderContext<T>(context: IslandRenderContext, render: () => T): T {
  const previous = activeContext;
  activeContext = context;
  try {
    return render();
  } finally {
    activeContext = previous;
  }
}

export function registerRenderedIsland(id: string): void {
  activeContext?.islands.add(id);
}
