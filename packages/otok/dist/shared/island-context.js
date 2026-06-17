let activeContext;
export function withIslandRenderContext(context, render) {
    const previous = activeContext;
    activeContext = context;
    try {
        return render();
    }
    finally {
        activeContext = previous;
    }
}
export function registerRenderedIsland(id) {
    if (!activeContext)
        return `otok-${id}`;
    activeContext.islands.add(id);
    const instanceId = `otok-${activeContext.nextIslandId}`;
    activeContext.nextIslandId += 1;
    return instanceId;
}
//# sourceMappingURL=island-context.js.map