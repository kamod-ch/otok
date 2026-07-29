import type { RouteEntry } from "./parser.js";

export interface RouteParamType {
  name: string;
  required: boolean;
  catchAll: boolean;
}

export function paramsFromRoutePattern(routePattern: string): RouteParamType[] {
  const segments = routePattern.split("/").filter(Boolean);
  const params: RouteParamType[] = [];

  for (const segment of segments) {
    const catchAll = /^\[\.\.\.([^\]]+)\]$/.exec(segment);
    if (catchAll) {
      params.push({ name: catchAll[1], required: true, catchAll: true });
      continue;
    }

    const optional = /^\[\[([^\]]+)\]\]$/.exec(segment);
    if (optional) {
      params.push({ name: optional[1], required: false, catchAll: false });
      continue;
    }

    const dynamic = /^\[([^\]]+)\]$/.exec(segment);
    if (dynamic) {
      params.push({ name: dynamic[1], required: true, catchAll: false });
    }
  }

  return params;
}

export function paramsTypeFromPattern(routePattern: string): string {
  const params = paramsFromRoutePattern(routePattern);
  if (params.length === 0) return "Record<string, never>";

  const fields = params.map((param) => {
    const valueType = param.catchAll ? "string | string[]" : "string";
    return param.required ? `${param.name}: ${valueType}` : `${param.name}?: ${valueType}`;
  });

  return `{ ${fields.join("; ")} }`;
}

export function paramsTypeFromRoutePath(routePath: string, routePattern: string): string {
  const params = paramsFromRoutePattern(routePattern);
  if (params.length === 0) return "Record<string, never>";

  const fields = params.map((param) => {
    const valueType = param.catchAll ? "string | string[]" : "string";
    const optionalInPath = routePath.includes(`/:${param.name}*`)
      ? false
      : routePath.includes(`/:${param.name}`)
        ? !param.required
        : !param.required;
    return optionalInPath ? `${param.name}?: ${valueType}` : `${param.name}: ${valueType}`;
  });

  return `{ ${fields.join("; ")} }`;
}

export function hasSearchParamsExport(routeFile: string, source: string): boolean {
  return /\bexport\s+const\s+searchParams\s*=/.test(source) || /\bexport\s+const\s+search\s*=/.test(source);
}

export function detectSearchParamsSchemaName(source: string): string | undefined {
  if (/\bexport\s+const\s+searchParams\s*=/.test(source)) return "searchParams";
  if (/\bexport\s+const\s+search\s*=/.test(source)) return "search";
  return undefined;
}

export function uniqueRoutesByFile(routes: RouteEntry[]): RouteEntry[] {
  const seen = new Map<string, RouteEntry>();
  for (const route of routes) {
    if (!seen.has(route.file)) seen.set(route.file, route);
  }
  return [...seen.values()].sort((a, b) => a.routePattern.localeCompare(b.routePattern));
}
