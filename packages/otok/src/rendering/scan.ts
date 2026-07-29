import type { RenderingConfig } from "./types.js";

const DEFINE_RENDERING = /defineRendering\s*\(\s*(\{[\s\S]*?\})\s*\)/;

/** Best-effort build-time scan for `defineRendering()` in route source files. */
export function scanRenderingFromSource(source: string): RenderingConfig | undefined {
  const match = DEFINE_RENDERING.exec(source);
  if (!match) return undefined;

  try {
    const config = new Function(`return (${match[1]});`)() as RenderingConfig;
    return config;
  } catch {
    return undefined;
  }
}

export function routeWantsPrerender(rendering: RenderingConfig | undefined): boolean {
  if (!rendering) return false;
  return (
    rendering.mode === "ssg" ||
    rendering.mode === "hybrid" ||
    rendering.prerender === true ||
    typeof rendering.prerender === "object"
  );
}
