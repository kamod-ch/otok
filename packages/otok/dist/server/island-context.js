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
    activeContext?.islands.add(id);
}
//# sourceMappingURL=island-context.js.map