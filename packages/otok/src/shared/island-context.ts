export interface IslandRenderContext {
  islands: Set<string>;
  nextIslandId: number;
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

export function registerRenderedIsland(id: string): string {
  if (!activeContext) return `otok-${id}`;

  activeContext.islands.add(id);
  const instanceId = `otok-${activeContext.nextIslandId}`;
  activeContext.nextIslandId += 1;
  return instanceId;
}
