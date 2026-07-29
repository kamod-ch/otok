import fs from "node:fs";
import path from "node:path";
import { normalizePath } from "./normalize-path.js";

export interface RouteEntry {
  id: string;
  file: string;
  routePath: string;
  routePattern: string;
  pattern: string;
  params: string[];
  score: number;
  layouts: string[];
  middleware: string[];
  /** Whether this variant comes from an optional segment expansion. */
  optionalVariant?: boolean;
}

export interface RoutesScanResult {
  routes: RouteEntry[];
  notFoundRoute?: RouteEntry;
  errorRoute?: RouteEntry;
}

export interface ScanRoutesOptions {
  root: string;
  routesDir: string;
}

type RoutePartKind = "static" | "dynamic" | "catchall" | "optional";

interface RoutePart {
  part: string;
  pattern: string;
  kind: RoutePartKind;
  param?: string;
}

interface RouteVariant {
  parts: RoutePart[];
  params: string[];
  staticCount: number;
  dynamicCount: number;
  catchAllCount: number;
  optionalCount: number;
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(fullPath));
    } else if (/\.[cm]?[tj]sx?$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

function stripExtension(file: string): string {
  return file.replace(/\.[cm]?[tj]sx?$/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emptyVariant(): RouteVariant {
  return { parts: [], params: [], staticCount: 0, dynamicCount: 0, catchAllCount: 0, optionalCount: 0 };
}

function appendPart(variant: RouteVariant, part: RoutePart): RouteVariant {
  return {
    parts: [...variant.parts, part],
    params: part.param ? [...variant.params, part.param] : variant.params,
    staticCount: variant.staticCount + (part.kind === "static" ? 1 : 0),
    dynamicCount: variant.dynamicCount + (part.kind === "dynamic" || part.kind === "optional" ? 1 : 0),
    catchAllCount: variant.catchAllCount + (part.kind === "catchall" ? 1 : 0),
    optionalCount: variant.optionalCount + (part.kind === "optional" ? 1 : 0),
  };
}

export function segmentToVariants(segment: string, variants: RouteVariant[]): RouteVariant[] {
  if (segment === "index" || segment.startsWith("_") || /^\(.+\)$/.test(segment)) return variants;

  const catchAll = /^\[\.\.\.([^\]]+)\]$/.exec(segment);
  if (catchAll) {
    return variants.map((variant) =>
      appendPart(variant, {
        part: `:${catchAll[1]}*`,
        pattern: "(.+)",
        kind: "catchall",
        param: catchAll[1],
      }),
    );
  }

  const optional = /^\[\[([^\]]+)\]\]$/.exec(segment);
  if (optional) {
    return variants.flatMap((variant) => [
      variant,
      appendPart(variant, {
        part: `:${optional[1]}`,
        pattern: "([^/]+)",
        kind: "optional",
        param: optional[1],
      }),
    ]);
  }

  const dynamic = /^\[([^\]]+)\]$/.exec(segment);
  if (dynamic) {
    return variants.map((variant) =>
      appendPart(variant, {
        part: `:${dynamic[1]}`,
        pattern: "([^/]+)",
        kind: "dynamic",
        param: dynamic[1],
      }),
    );
  }

  return variants.map((variant) =>
    appendPart(variant, {
      part: segment,
      pattern: escapeRegex(segment),
      kind: "static",
    }),
  );
}

export function publicRoutePattern(relative: string): string {
  const segments = relative
    .split("/")
    .filter((segment) => segment !== "index" && !/^\(.+\)$/.test(segment));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function layoutFilesForRoute(relative: string, layoutMap: Map<string, string>): string[] {
  const dir = normalizePath(path.dirname(relative));
  const segments = dir === "." ? [] : dir.split("/");
  const keys = ["", ...segments.map((_, index) => segments.slice(0, index + 1).join("/"))];
  return keys.map((key) => layoutMap.get(key)).filter((file): file is string => Boolean(file));
}

function middlewareFilesForRoute(relative: string, middlewareMap: Map<string, string>): string[] {
  const dir = normalizePath(path.dirname(relative));
  const segments = dir === "." ? [] : dir.split("/");
  const keys = ["", ...segments.map((_, index) => segments.slice(0, index + 1).join("/"))];
  return keys.map((key) => middlewareMap.get(key)).filter((file): file is string => Boolean(file));
}

export function routeFileToEntries(
  file: string,
  routesDir: string,
  layoutMap: Map<string, string>,
  middlewareMap: Map<string, string>,
): RouteEntry[] {
  const relative = normalizePath(path.relative(routesDir, stripExtension(file)));
  const routePattern = publicRoutePattern(relative);
  const segments = relative.split("/");
  const variants = segments.reduce(
    (current, segment) => segmentToVariants(segment, current),
    [emptyVariant()] as RouteVariant[],
  );
  const layouts = layoutFilesForRoute(relative, layoutMap);
  const middleware = middlewareFilesForRoute(relative, middlewareMap);

  return variants.map((variant, index) => {
    const routeParts = variant.parts.map((part) => part.part);
    const routePath = `/${routeParts.join("/")}`.replace(/\/$/, "") || "/";
    const patternParts = variant.parts.map((part) => part.pattern);
    const pattern = patternParts.length > 0 ? `^/${patternParts.join("/")}/?$` : "^/?$";

    return {
      id: `${relative.replaceAll("/", ".")}${variants.length > 1 ? `.${index}` : ""}`,
      file,
      routePath,
      routePattern,
      pattern,
      params: variant.params,
      score: variant.staticCount * 100 - variant.dynamicCount * 10 - variant.catchAllCount * 1000,
      layouts,
      middleware,
      optionalVariant: variant.optionalCount > 0,
    };
  });
}

export function scanRoutes({ root, routesDir }: ScanRoutesOptions): RoutesScanResult {
  const absoluteRoutesDir = path.resolve(root, routesDir);
  const files = walk(absoluteRoutesDir).filter((file) => !path.basename(file).startsWith("$"));
  const layoutMap = new Map<string, string>();
  const middlewareMap = new Map<string, string>();

  for (const file of files) {
    const name = path.basename(stripExtension(file));
    if (name !== "_layout" && name !== "_middleware") continue;
    const relativeDir = normalizePath(path.dirname(path.relative(absoluteRoutesDir, file)));
    const key = relativeDir === "." ? "" : relativeDir;
    if (name === "_layout") layoutMap.set(key, file);
    else middlewareMap.set(key, file);
  }

  const pages = files.filter((file) => {
    const name = path.basename(stripExtension(file));
    return name !== "_layout" && name !== "_middleware" && name !== "_not-found" && name !== "_error";
  });

  return {
    routes: pages
      .flatMap((file) => routeFileToEntries(file, absoluteRoutesDir, layoutMap, middlewareMap))
      .sort((a, b) => b.score - a.score || a.routePath.localeCompare(b.routePath)),
    notFoundRoute: files
      .filter((file) => path.basename(stripExtension(file)) === "_not-found")
      .flatMap((file) => routeFileToEntries(file, absoluteRoutesDir, layoutMap, middlewareMap))[0],
    errorRoute: files
      .filter((file) => path.basename(stripExtension(file)) === "_error")
      .flatMap((file) => routeFileToEntries(file, absoluteRoutesDir, layoutMap, middlewareMap))[0],
  };
}

export function routePatternsForScan(scan: RoutesScanResult): string[] {
  return [...new Set(scan.routes.map((route) => route.routePattern))];
}

export function isApiRoute(relativePattern: string): boolean {
  return relativePattern.startsWith("api/") || relativePattern.includes("/api/");
}

export function isLayoutFile(file: string): boolean {
  return path.basename(stripExtension(file)) === "_layout";
}

export function isSpecialRouteFile(file: string): boolean {
  const name = path.basename(stripExtension(file));
  return name === "_layout" || name === "_middleware" || name === "_not-found" || name === "_error";
}

export function routeModuleId(relativePattern: string): string {
  return relativePattern.replaceAll("/", ".") || "index";
}
