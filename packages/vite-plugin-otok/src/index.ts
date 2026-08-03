import fs from "node:fs";
import path from "node:path";
import type { Plugin, UserConfig, ViteDevServer } from "vite";
import { normalizePath } from "vite";
import { runRouteTypegen, formatRouteIssues } from "@otok/route-typegen";
import { generateOtokConfigModule } from "./config-loader.js";
import { loadResolvedOtokConfig, RESOLVED_OTOK_CONFIG_MODULE_ID } from "./plugin-bridge.js";

const OTOK_CONFIG_MODULE_ID = "virtual:otok-config";

const ROUTES_MODULE_ID = "virtual:otok-routes";
const ISLANDS_MODULE_ID = "virtual:otok-islands";
const RESOLVED_ROUTES_MODULE_ID = `\0${ROUTES_MODULE_ID}.ts`;
const RESOLVED_ISLANDS_MODULE_ID = `\0${ISLANDS_MODULE_ID}`;

export interface OtokPluginOptions {
  appDir?: string;
  routesDir?: string;
  islandsDir?: string;
  configFile?: string;
  /** Directory for generated route types. Default: `.otok/types`. */
  typesDir?: string;
  /** Disable automatic route type generation. */
  typegen?: boolean;
}

interface RouteEntry {
  id: string;
  file: string;
  routePath: string;
  routePattern: string;
  pattern: string;
  params: string[];
  score: number;
  layouts: string[];
  middleware: string[];
  /**
   * First-class optional locale segment (`[[lang]]` / `[[locale]]`) present on this variant.
   * Omitted on the path variant that drops the optional segment.
   */
  localeParam?: string;
}

/** Optional filesystem segments treated as locale prefixes by convention. */
export const LOCALE_OPTIONAL_PARAM_NAMES = new Set(["lang", "locale"]);

export function isLocaleOptionalSegment(segment: string): boolean {
  const optional = /^\[\[([^\]]+)\]\]$/.exec(segment);
  return Boolean(optional && LOCALE_OPTIONAL_PARAM_NAMES.has(optional[1]!));
}

interface RoutesScanResult {
  routes: RouteEntry[];
  notFoundRoute?: RouteEntry;
  errorRoute?: RouteEntry;
}

interface IslandEntry {
  id: string;
  altId: string;
  file: string;
  exportName: string;
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

function pascalCase(value: string): string {
  return value
    .replace(/^\$/, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function stripExtension(file: string): string {
  return file.replace(/\.[cm]?[tj]sx?$/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
}

function emptyVariant(): RouteVariant {
  return { parts: [], params: [], staticCount: 0, dynamicCount: 0, catchAllCount: 0 };
}

function appendPart(variant: RouteVariant, part: RoutePart): RouteVariant {
  return {
    parts: [...variant.parts, part],
    params: part.param ? [...variant.params, part.param] : variant.params,
    staticCount: variant.staticCount + (part.kind === "static" ? 1 : 0),
    dynamicCount: variant.dynamicCount + (part.kind === "dynamic" || part.kind === "optional" ? 1 : 0),
    catchAllCount: variant.catchAllCount + (part.kind === "catchall" ? 1 : 0),
  };
}

function segmentToVariants(segment: string, variants: RouteVariant[]): RouteVariant[] {
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

function publicRoutePattern(relative: string): string {
  const segments = relative
    .split("/")
    .filter((segment) => segment !== "index" && !/^\(.+\)$/.test(segment));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function routeFileToEntries(
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
    const localePart = variant.parts.find(
      (part) => part.kind === "optional" && part.param && LOCALE_OPTIONAL_PARAM_NAMES.has(part.param),
    );

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
      localeParam: localePart?.param,
    };
  });
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

function scanRoutes(root: string, routesDir: string): RoutesScanResult {
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

function scanIslands(root: string, appDir: string, islandsDir: string, routesDir: string): IslandEntry[] {
  const absoluteIslandsDir = path.resolve(root, islandsDir);
  const absoluteRoutesDir = path.resolve(root, routesDir);
  const files = [
    ...walk(absoluteIslandsDir),
    ...walk(absoluteRoutesDir).filter((file) => path.basename(file).startsWith("$")),
  ];
  const seen = new Set<string>();
  const idOwners = new Map<string, string>();

  return files
    .filter((file) => {
      if (seen.has(file)) return false;
      seen.add(file);
      return true;
    })
    .map((file) => {
      const base = path.basename(stripExtension(file));
      const exportName = pascalCase(base);
      const relative = normalizePath(path.relative(path.resolve(root, appDir), stripExtension(file)));
      const existing = idOwners.get(exportName);
      if (existing) {
        console.warn(
          `[otok] Island id collision "${exportName}": ${existing} and ${file}. Hydration may load the wrong component.`,
        );
      } else {
        idOwners.set(exportName, file);
      }
      return {
        id: exportName,
        altId: base.replace(/^\$/, ""),
        file,
        exportName,
        importPath: relative,
      };
    });
}

function modulePath(file: string): string {
  return normalizePath(file);
}

export interface RouteBuildOptions {
  params?: Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>;
  query?: Record<string, string | number | boolean | Array<string | number | boolean | null | undefined> | null | undefined>;
  hash?: string;
}

function appendQuery(url: string, query: RouteBuildOptions["query"]): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined || item === null) continue;
      params.append(key, String(item));
    }
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function appendHash(url: string, hash: string | undefined): string {
  if (!hash) return url;
  return `${url}#${encodeURIComponent(hash.replace(/^#/, ""))}`;
}

export function buildRoutePath(pattern: string, options: RouteBuildOptions = {}): string {
  const params = options.params ?? {};
  const segments = pattern.split("/").filter(Boolean);
  const output: string[] = [];

  for (const segment of segments) {
    if (/^\(.+\)$/.test(segment)) continue;
    const optional = /^\[\[([^\]]+)\]\]$/.exec(segment);
    if (optional) {
      const value = params[optional[1]];
      if (value !== undefined && value !== null && value !== "") output.push(encodeURIComponent(String(value)));
      continue;
    }

    const catchAll = /^\[\.\.\.([^\]]+)\]$/.exec(segment);
    if (catchAll) {
      const value = params[catchAll[1]];
      if (value === undefined || value === null || value === "") {
        throw new Error(`otok: Missing route param "${catchAll[1]}" for ${pattern}.`);
      }
      const values = Array.isArray(value) ? value : String(value).split("/");
      output.push(...values.map((part) => encodeURIComponent(String(part))));
      continue;
    }

    const dynamic = /^\[([^\]]+)\]$/.exec(segment);
    if (dynamic) {
      const value = params[dynamic[1]];
      if (value === undefined || value === null || value === "") {
        throw new Error(`otok: Missing route param "${dynamic[1]}" for ${pattern}.`);
      }
      output.push(encodeURIComponent(String(value)));
      continue;
    }

    output.push(encodeURIComponent(segment));
  }

  return appendHash(appendQuery(`/${output.join("/")}`.replace(/\/$/, "") || "/", options.query), options.hash);
}

function routeToModuleEntry(
  route: RouteEntry,
  moduleName: string,
  layoutNames: string[],
  middlewareNames: string[],
): string {
  return `{
    id: ${JSON.stringify(route.id)},
    path: ${JSON.stringify(route.routePath)},
    pattern: new RegExp(${JSON.stringify(route.pattern)}),
    params: ${JSON.stringify(route.params)},
    localeParam: ${JSON.stringify(route.localeParam)},
    module: ${moduleName},
    layouts: [${layoutNames.join(", ")}],
    middleware: [${middlewareNames.join(", ")}]
  }`;
}

function routePatternsForScan(scan: RoutesScanResult): string[] {
  return [...new Set(scan.routes.map((route) => route.routePattern))];
}

function generateRoutesModule(scan: RoutesScanResult): string {
  const routeImports = scan.routes.map((route, index) => `import * as route${index} from "${modulePath(route.file)}";`);
  const specialRoutes = [scan.notFoundRoute, scan.errorRoute].filter((route): route is RouteEntry => Boolean(route));
  const specialImports = specialRoutes.map(
    (route, index) => `import * as specialRoute${index} from "${modulePath(route.file)}";`,
  );
  const layoutFiles = [...new Set([...scan.routes, ...specialRoutes].flatMap((route) => route.layouts))];
  const layoutImports = layoutFiles.map((file, index) => `import * as layout${index} from "${modulePath(file)}";`);
  const layoutNameForFile = new Map(layoutFiles.map((file, index) => [file, `layout${index}`]));
  const middlewareFiles = [...new Set([...scan.routes, ...specialRoutes].flatMap((route) => route.middleware))];
  const middlewareImports = middlewareFiles.map(
    (file, index) => `import * as middleware${index} from "${modulePath(file)}";`,
  );
  const middlewareNameForFile = new Map(middlewareFiles.map((file, index) => [file, `middleware${index}`]));
  const routeEntries = scan.routes.map((route, index) =>
    routeToModuleEntry(
      route,
      `route${index}`,
      route.layouts.map((file) => layoutNameForFile.get(file) ?? "").filter(Boolean),
      route.middleware.map((file) => middlewareNameForFile.get(file) ?? "").filter(Boolean),
    ),
  );

  const notFoundRoute = scan.notFoundRoute
    ? routeToModuleEntry(
        scan.notFoundRoute,
        "specialRoute0",
        scan.notFoundRoute.layouts.map((file) => layoutNameForFile.get(file) ?? "").filter(Boolean),
        scan.notFoundRoute.middleware.map((file) => middlewareNameForFile.get(file) ?? "").filter(Boolean),
      )
    : "undefined";
  const errorRoute = scan.errorRoute
    ? routeToModuleEntry(
        scan.errorRoute,
        `specialRoute${scan.notFoundRoute ? 1 : 0}`,
        scan.errorRoute.layouts.map((file) => layoutNameForFile.get(file) ?? "").filter(Boolean),
        scan.errorRoute.middleware.map((file) => middlewareNameForFile.get(file) ?? "").filter(Boolean),
      )
    : "undefined";

  return `${[...routeImports, ...specialImports, ...layoutImports, ...middlewareImports].join("\n")}

const routePatterns = ${JSON.stringify(routePatternsForScan(scan))};

function appendQuery(url, query) {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined || item === null) continue;
      params.append(key, String(item));
    }
  }
  const queryString = params.toString();
  return queryString ? url + "?" + queryString : url;
}

function appendHash(url, hash) {
  if (!hash) return url;
  return url + "#" + encodeURIComponent(hash.replace(/^#/, ""));
}

function buildRoutePath(pattern, options = {}) {
  const params = options.params ?? {};
  const segments = pattern.split("/").filter(Boolean);
  const output = [];

  for (const segment of segments) {
    if (/^\\(.+\\)$/.test(segment)) continue;
    const optional = /^\\[\\[([^\\]]+)\\]\\]$/.exec(segment);
    if (optional) {
      const value = params[optional[1]];
      if (value !== undefined && value !== null && value !== "") output.push(encodeURIComponent(String(value)));
      continue;
    }

    const catchAll = /^\\[\\.\\.\\.([^\\]]+)\\]$/.exec(segment);
    if (catchAll) {
      const value = params[catchAll[1]];
      if (value === undefined || value === null || value === "") throw new Error("otok: Missing route param \\\"" + catchAll[1] + "\\\" for " + pattern + ".");
      const values = Array.isArray(value) ? value : String(value).split("/");
      output.push(...values.map((part) => encodeURIComponent(String(part))));
      continue;
    }

    const dynamic = /^\\[([^\\]]+)\\]$/.exec(segment);
    if (dynamic) {
      const value = params[dynamic[1]];
      if (value === undefined || value === null || value === "") throw new Error("otok: Missing route param \\\"" + dynamic[1] + "\\\" for " + pattern + ".");
      output.push(encodeURIComponent(String(value)));
      continue;
    }

    output.push(encodeURIComponent(segment));
  }

  return appendHash(appendQuery(("/" + output.join("/")).replace(/\\/$/, "") || "/", options.query), options.hash);
}

export function route(pattern, options = {}) {
  if (!routePatterns.includes(pattern) && import.meta.env?.DEV) {
    console.warn("[otok] Unknown route pattern \\\"" + pattern + "\\\".");
  }
  return buildRoutePath(pattern, options);
}

export const routePaths = ${JSON.stringify([...new Set(scan.routes.map((route) => route.routePath))])};
export const routeFilePatterns = routePatterns;

export const routes = [
  ${routeEntries.join(",\n  ")}
];

export const notFoundRoute = ${notFoundRoute};
export const errorRoute = ${errorRoute};
`;
}

function generateIslandsModule(islands: IslandEntry[]): string {
  const entries = islands.flatMap((island) => {
    const load = `() => import("${modulePath(island.file)}")`;
    return [
      `${JSON.stringify(island.id)}: ${load}`,
      island.altId && island.altId !== island.id ? `${JSON.stringify(island.altId)}: ${load}` : undefined,
    ].filter(Boolean);
  });

  return `export const islandModules = {
  ${entries.join(",\n  ")}
};

if (typeof window !== "undefined") {
  window.__OTOK_ISLANDS__ = islandModules;
}

export default islandModules;
`;
}

function isIslandFile(file: string, routesPath: string, islandsPath: string): boolean {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith(normalizePath(islandsPath)) ||
    (normalized.startsWith(normalizePath(routesPath)) && path.basename(normalized).startsWith("$"))
  );
}

function islandIdForFile(file: string): string {
  return pascalCase(path.basename(stripExtension(file)));
}

function injectIslandId(code: string, id: string): string {
  const defaultFunction = /\bexport\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(code);
  if (defaultFunction) {
    return `${code}\n\n${defaultFunction[1]}.__otokIslandId = ${JSON.stringify(id)};\n`;
  }

  const anonymousFunction = /\bexport\s+default\s+function\s*\(/;
  if (anonymousFunction.test(code)) {
    return `${code.replace(anonymousFunction, "function __OtokDefaultIsland(")}

__OtokDefaultIsland.__otokIslandId = ${JSON.stringify(id)};
export default __OtokDefaultIsland;
`;
  }

  const defaultIdentifier = /\bexport\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/.exec(code);
  if (defaultIdentifier) {
    return `${code}\n\n${defaultIdentifier[1]}.__otokIslandId = ${JSON.stringify(id)};\n`;
  }

  const defaultExpression = /\bexport\s+default\s+/;
  if (defaultExpression.test(code)) {
    return `${code.replace(defaultExpression, "const __OtokDefaultIsland = ")}

__OtokDefaultIsland.__otokIslandId = ${JSON.stringify(id)};
export default __OtokDefaultIsland;
`;
  }

  return code;
}

function invalidateVirtualModules(server: ViteDevServer): void {
  for (const id of [RESOLVED_ROUTES_MODULE_ID, RESOLVED_ISLANDS_MODULE_ID]) {
    const mod = server.moduleGraph.getModuleById(id);
    if (mod) server.moduleGraph.invalidateModule(mod);
  }
}

function runPluginTypegen(root: string, routesDir: string, typesDir: string | undefined, strict: boolean): void {
  try {
    const result = runRouteTypegen({
      root,
      routesDir,
      outputDir: typesDir,
      strict: false,
    });

    for (const issue of result.issues) {
      const formatted = formatRouteIssues([issue]);
      if (issue.severity === "error") {
        console.error(`[otok] ${formatted}`);
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(`[otok] ${formatted}`);
      }
    }

    if (strict && !result.ok) {
      throw new Error(formatRouteIssues(result.issues.filter((issue) => issue.severity === "error")));
    }
  } catch (error) {
    if (strict) throw error;
    console.warn(`[otok] Route type generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default function otok(options: OtokPluginOptions = {}): Plugin[] {
  const appDir = options.appDir ?? "src/app";
  const routesDir = options.routesDir ?? path.join(appDir, "routes");
  const islandsDir = options.islandsDir ?? path.join(appDir, "islands");
  const typesDir = options.typesDir ?? ".otok/types";
  const typegenEnabled = options.typegen !== false;
  let root = process.cwd();
  let routesPath = path.resolve(root, routesDir);
  let islandsPath = path.resolve(root, islandsDir);
  let pluginContainer: Awaited<ReturnType<typeof loadResolvedOtokConfig>>["container"];
  let bridgeSource = generateOtokConfigModule(undefined, root);
  let virtualModules = new Map<string, () => string | Promise<string>>();
  let ssrBuild = false;

  const corePlugin: Plugin = {
    name: "otok",
    enforce: "pre",
    async config(_userConfig, env) {
      const root = process.cwd();
      const loaded = await loadResolvedOtokConfig(
        options.configFile,
        root,
        env.mode === "production" ? "production" : "development",
        env.command,
      );
      pluginContainer = loaded.container;
      bridgeSource = loaded.configModuleSource;
      virtualModules = new Map(
        [...loaded.resolved.virtualModules.entries()].map(([id, factory]) => [id, () => factory()]),
      );

      return {
        plugins: [...loaded.resolved.vitePlugins],
      } as UserConfig;
    },
    configResolved(config) {
      root = config.root;
      routesPath = path.resolve(root, routesDir);
      islandsPath = path.resolve(root, islandsDir);
      ssrBuild = Boolean(config.build.ssr);
    },
    resolveId(id) {
      if (id === ROUTES_MODULE_ID) return RESOLVED_ROUTES_MODULE_ID;
      if (id === ISLANDS_MODULE_ID) return RESOLVED_ISLANDS_MODULE_ID;
      if (id === OTOK_CONFIG_MODULE_ID) return RESOLVED_OTOK_CONFIG_MODULE_ID;
      for (const [virtualId, resolvedId] of [...virtualModules.entries()].map(([moduleId]) => [moduleId, `\0${moduleId}`] as const)) {
        if (id === virtualId) return resolvedId;
      }
      return undefined;
    },
    async load(id) {
      if (id === RESOLVED_ROUTES_MODULE_ID) {
        return generateRoutesModule(scanRoutes(root, routesDir));
      }
      if (id === RESOLVED_ISLANDS_MODULE_ID) {
        return generateIslandsModule(scanIslands(root, appDir, islandsDir, routesDir));
      }
      if (id === RESOLVED_OTOK_CONFIG_MODULE_ID) {
        return bridgeSource;
      }
      for (const [virtualId, factory] of virtualModules) {
        if (id !== `\0${virtualId}`) continue;
        return await factory();
      }
      return undefined;
    },
    transform(code, id) {
      const file = id.split("?")[0];
      if (!/\.[cm]?[tj]sx?$/.test(file) || !isIslandFile(file, routesPath, islandsPath)) return undefined;
      return injectIslandId(code, islandIdForFile(file));
    },
    configureServer(server: ViteDevServer) {
      void pluginContainer?.runConfigureServer(server);
      server.watcher.add([routesPath, islandsPath]);
      let typegenTimer: NodeJS.Timeout | undefined;

      const scheduleTypegen = () => {
        if (!typegenEnabled) return;
        clearTimeout(typegenTimer);
        typegenTimer = setTimeout(() => {
          runPluginTypegen(root, routesDir, typesDir, false);
        }, 80);
      };

      scheduleTypegen();

      server.watcher.on("add", (file) => {
        if (file.startsWith(routesPath) || file.startsWith(islandsPath)) {
          invalidateVirtualModules(server);
          scheduleTypegen();
        }
      });
      server.watcher.on("change", (file) => {
        if (file.startsWith(routesPath) || file.startsWith(islandsPath)) {
          invalidateVirtualModules(server);
          scheduleTypegen();
        }
      });
      server.watcher.on("unlink", (file) => {
        if (file.startsWith(routesPath) || file.startsWith(islandsPath)) {
          invalidateVirtualModules(server);
          scheduleTypegen();
        }
      });
    },
    buildStart() {
      if (typegenEnabled) {
        runPluginTypegen(root, routesDir, typesDir, true);
      }
      void pluginContainer?.runBuildStart(ssrBuild);
    },
    buildEnd() {
      void pluginContainer?.runBuildEnd(ssrBuild);
    },
  };

  return [corePlugin];
}

export { otok };
export const __testing = {
  buildRoutePath,
  generateRoutesModule,
  injectIslandId,
  scanRoutes,
};
