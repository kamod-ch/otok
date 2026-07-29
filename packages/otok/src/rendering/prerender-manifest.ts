import type { PrerenderConfig } from "./types.js";

export interface PrerenderEntry {
  path: string;
  routePattern?: string;
  file?: string;
}

export interface PrerenderManifest {
  generatedAt: string;
  entries: PrerenderEntry[];
}

function expandParams(
  pattern: string,
  params: Record<string, string | string[]>,
): string[] {
  const dynamic = Object.entries(params);
  if (dynamic.length === 0) return [pattern];

  const [key, value] = dynamic[0];
  const rest = Object.fromEntries(dynamic.slice(1));
  const values = Array.isArray(value) ? value : [value];

  return values.flatMap((item) => {
    const nextPattern = pattern.replace(`[${key}]`, item).replace(`:${key}`, item);
    return expandParams(nextPattern, rest);
  });
}

function staticPathFromPattern(pattern: string): string | undefined {
  if (/[\[*]/.test(pattern)) return undefined;
  return pattern.startsWith("/") ? pattern : `/${pattern}`;
}

export async function collectPrerenderEntries(
  routes: Array<{
    routePattern: string;
    routePath: string;
    file: string;
    rendering?: { mode?: string; prerender?: boolean | PrerenderConfig };
  }>,
): Promise<PrerenderManifest> {
  const entries: PrerenderEntry[] = [];
  const seen = new Set<string>();

  for (const route of routes) {
    const mode = route.rendering?.mode;
    const wantsPrerender =
      mode === "ssg" ||
      mode === "hybrid" ||
      route.rendering?.prerender === true ||
      typeof route.rendering?.prerender === "object";

    if (!wantsPrerender) {
      const staticPath = staticPathFromPattern(route.routePattern);
      if (staticPath && !seen.has(staticPath)) {
        seen.add(staticPath);
        entries.push({ path: staticPath, routePattern: route.routePattern, file: route.file });
      }
      continue;
    }

    const staticPath = staticPathFromPattern(route.routePattern);
    if (staticPath && !seen.has(staticPath)) {
      seen.add(staticPath);
      entries.push({ path: staticPath, routePattern: route.routePattern, file: route.file });
    }

    const prerender = typeof route.rendering?.prerender === "object" ? route.rendering.prerender : undefined;
    if (prerender?.paths) {
      const paths = typeof prerender.paths === "function" ? await prerender.paths() : prerender.paths;
      for (const path of paths) {
        if (!seen.has(path)) {
          seen.add(path);
          entries.push({ path, routePattern: route.routePattern, file: route.file });
        }
      }
    }

    if (prerender?.params) {
      const params = typeof prerender.params === "function" ? await prerender.params() : prerender.params;
      for (const path of expandParams(route.routePath, params)) {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          entries.push({ path: normalized, routePattern: route.routePattern, file: route.file });
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
  };
}
