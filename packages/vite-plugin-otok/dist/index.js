import fs from "node:fs";
import path from "node:path";
import { normalizePath } from "vite";
const ROUTES_MODULE_ID = "virtual:otok-routes";
const ISLANDS_MODULE_ID = "virtual:otok-islands";
const RESOLVED_ROUTES_MODULE_ID = `\0${ROUTES_MODULE_ID}.ts`;
const RESOLVED_ISLANDS_MODULE_ID = `\0${ISLANDS_MODULE_ID}`;
function walk(dir) {
    if (!fs.existsSync(dir))
        return [];
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith("."))
            continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...walk(fullPath));
        }
        else if (/\.[cm]?[tj]sx?$/.test(entry.name)) {
            result.push(fullPath);
        }
    }
    return result;
}
function pascalCase(value) {
    return value
        .replace(/^\$/, "")
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join("");
}
function stripExtension(file) {
    return file.replace(/\.[cm]?[tj]sx?$/, "");
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function emptyVariant() {
    return { parts: [], params: [], staticCount: 0, dynamicCount: 0, catchAllCount: 0 };
}
function appendPart(variant, part) {
    return {
        parts: [...variant.parts, part],
        params: part.param ? [...variant.params, part.param] : variant.params,
        staticCount: variant.staticCount + (part.kind === "static" ? 1 : 0),
        dynamicCount: variant.dynamicCount + (part.kind === "dynamic" ? 1 : 0),
        catchAllCount: variant.catchAllCount + (part.kind === "catchall" ? 1 : 0),
    };
}
function segmentToVariants(segment, variants) {
    if (segment === "index" || segment.startsWith("_") || /^\(.+\)$/.test(segment))
        return variants;
    const catchAll = /^\[\.\.\.([^\]]+)\]$/.exec(segment);
    if (catchAll) {
        return variants.map((variant) => appendPart(variant, {
            part: `:${catchAll[1]}*`,
            pattern: "(.+)",
            kind: "catchall",
            param: catchAll[1],
        }));
    }
    const optional = /^\[\[([^\]]+)\]\]$/.exec(segment);
    if (optional) {
        return variants.flatMap((variant) => [
            variant,
            appendPart(variant, {
                part: `:${optional[1]}`,
                pattern: "([^/]+)",
                kind: "dynamic",
                param: optional[1],
            }),
        ]);
    }
    const dynamic = /^\[([^\]]+)\]$/.exec(segment);
    if (dynamic) {
        return variants.map((variant) => appendPart(variant, {
            part: `:${dynamic[1]}`,
            pattern: "([^/]+)",
            kind: "dynamic",
            param: dynamic[1],
        }));
    }
    return variants.map((variant) => appendPart(variant, {
        part: segment,
        pattern: escapeRegex(segment),
        kind: "static",
    }));
}
function routeFileToEntries(file, routesDir, layoutMap, middlewareMap) {
    const relative = normalizePath(path.relative(routesDir, stripExtension(file)));
    const segments = relative.split("/");
    const variants = segments.reduce((current, segment) => segmentToVariants(segment, current), [emptyVariant()]);
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
            pattern,
            params: variant.params,
            score: variant.staticCount * 100 - variant.dynamicCount * 10 - variant.catchAllCount * 1000,
            layouts,
            middleware,
        };
    });
}
function layoutFilesForRoute(relative, layoutMap) {
    const dir = normalizePath(path.dirname(relative));
    const segments = dir === "." ? [] : dir.split("/");
    const keys = ["", ...segments.map((_, index) => segments.slice(0, index + 1).join("/"))];
    return keys.map((key) => layoutMap.get(key)).filter((file) => Boolean(file));
}
function middlewareFilesForRoute(relative, middlewareMap) {
    const dir = normalizePath(path.dirname(relative));
    const segments = dir === "." ? [] : dir.split("/");
    const keys = ["", ...segments.map((_, index) => segments.slice(0, index + 1).join("/"))];
    return keys.map((key) => middlewareMap.get(key)).filter((file) => Boolean(file));
}
function scanRoutes(root, routesDir) {
    const absoluteRoutesDir = path.resolve(root, routesDir);
    const files = walk(absoluteRoutesDir).filter((file) => !path.basename(file).startsWith("$"));
    const layoutMap = new Map();
    const middlewareMap = new Map();
    for (const file of files) {
        const name = path.basename(stripExtension(file));
        if (name !== "_layout" && name !== "_middleware")
            continue;
        const relativeDir = normalizePath(path.dirname(path.relative(absoluteRoutesDir, file)));
        const key = relativeDir === "." ? "" : relativeDir;
        if (name === "_layout")
            layoutMap.set(key, file);
        else
            middlewareMap.set(key, file);
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
function scanIslands(root, appDir, islandsDir, routesDir) {
    const absoluteIslandsDir = path.resolve(root, islandsDir);
    const absoluteRoutesDir = path.resolve(root, routesDir);
    const files = [
        ...walk(absoluteIslandsDir),
        ...walk(absoluteRoutesDir).filter((file) => path.basename(file).startsWith("$")),
    ];
    const seen = new Set();
    const idOwners = new Map();
    return files
        .filter((file) => {
        if (seen.has(file))
            return false;
        seen.add(file);
        return true;
    })
        .map((file) => {
        const base = path.basename(stripExtension(file));
        const exportName = pascalCase(base);
        const relative = normalizePath(path.relative(path.resolve(root, appDir), stripExtension(file)));
        const existing = idOwners.get(exportName);
        if (existing) {
            console.warn(`[otok] Island id collision "${exportName}": ${existing} and ${file}. Hydration may load the wrong component.`);
        }
        else {
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
function modulePath(file) {
    return normalizePath(file);
}
function routeToModuleEntry(route, moduleName, layoutNames, middlewareNames) {
    return `{
    id: ${JSON.stringify(route.id)},
    path: ${JSON.stringify(route.routePath)},
    pattern: new RegExp(${JSON.stringify(route.pattern)}),
    params: ${JSON.stringify(route.params)},
    module: ${moduleName},
    layouts: [${layoutNames.join(", ")}],
    middleware: [${middlewareNames.join(", ")}]
  }`;
}
function generateRoutesModule(scan) {
    const routeImports = scan.routes.map((route, index) => `import * as route${index} from "${modulePath(route.file)}";`);
    const specialRoutes = [scan.notFoundRoute, scan.errorRoute].filter((route) => Boolean(route));
    const specialImports = specialRoutes.map((route, index) => `import * as specialRoute${index} from "${modulePath(route.file)}";`);
    const layoutFiles = [...new Set([...scan.routes, ...specialRoutes].flatMap((route) => route.layouts))];
    const layoutImports = layoutFiles.map((file, index) => `import * as layout${index} from "${modulePath(file)}";`);
    const layoutNameForFile = new Map(layoutFiles.map((file, index) => [file, `layout${index}`]));
    const middlewareFiles = [...new Set([...scan.routes, ...specialRoutes].flatMap((route) => route.middleware))];
    const middlewareImports = middlewareFiles.map((file, index) => `import * as middleware${index} from "${modulePath(file)}";`);
    const middlewareNameForFile = new Map(middlewareFiles.map((file, index) => [file, `middleware${index}`]));
    const routeEntries = scan.routes.map((route, index) => routeToModuleEntry(route, `route${index}`, route.layouts.map((file) => layoutNameForFile.get(file) ?? "").filter(Boolean), route.middleware.map((file) => middlewareNameForFile.get(file) ?? "").filter(Boolean)));
    const notFoundRoute = scan.notFoundRoute
        ? routeToModuleEntry(scan.notFoundRoute, "specialRoute0", scan.notFoundRoute.layouts.map((file) => layoutNameForFile.get(file) ?? "").filter(Boolean), scan.notFoundRoute.middleware.map((file) => middlewareNameForFile.get(file) ?? "").filter(Boolean))
        : "undefined";
    const errorRoute = scan.errorRoute
        ? routeToModuleEntry(scan.errorRoute, `specialRoute${scan.notFoundRoute ? 1 : 0}`, scan.errorRoute.layouts.map((file) => layoutNameForFile.get(file) ?? "").filter(Boolean), scan.errorRoute.middleware.map((file) => middlewareNameForFile.get(file) ?? "").filter(Boolean))
        : "undefined";
    return `${[...routeImports, ...specialImports, ...layoutImports, ...middlewareImports].join("\n")}

export const routePaths = ${JSON.stringify([...new Set(scan.routes.map((route) => route.routePath))])};

export const routes = [
  ${routeEntries.join(",\n  ")}
];

export const notFoundRoute = ${notFoundRoute};
export const errorRoute = ${errorRoute};
`;
}
function generateIslandsModule(islands) {
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
function isIslandFile(file, routesPath, islandsPath) {
    const normalized = normalizePath(file);
    return (normalized.startsWith(normalizePath(islandsPath)) ||
        (normalized.startsWith(normalizePath(routesPath)) && path.basename(normalized).startsWith("$")));
}
function islandIdForFile(file) {
    return pascalCase(path.basename(stripExtension(file)));
}
function injectIslandId(code, id) {
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
function invalidateVirtualModules(server) {
    for (const id of [RESOLVED_ROUTES_MODULE_ID, RESOLVED_ISLANDS_MODULE_ID]) {
        const mod = server.moduleGraph.getModuleById(id);
        if (mod)
            server.moduleGraph.invalidateModule(mod);
    }
}
export default function otok(options = {}) {
    const appDir = options.appDir ?? "src/app";
    const routesDir = options.routesDir ?? path.join(appDir, "routes");
    const islandsDir = options.islandsDir ?? path.join(appDir, "islands");
    let root = process.cwd();
    let routesPath = path.resolve(root, routesDir);
    let islandsPath = path.resolve(root, islandsDir);
    return {
        name: "otok",
        enforce: "pre",
        configResolved(config) {
            root = config.root;
            routesPath = path.resolve(root, routesDir);
            islandsPath = path.resolve(root, islandsDir);
        },
        resolveId(id) {
            if (id === ROUTES_MODULE_ID)
                return RESOLVED_ROUTES_MODULE_ID;
            if (id === ISLANDS_MODULE_ID)
                return RESOLVED_ISLANDS_MODULE_ID;
            return undefined;
        },
        load(id) {
            if (id === RESOLVED_ROUTES_MODULE_ID) {
                return generateRoutesModule(scanRoutes(root, routesDir));
            }
            if (id === RESOLVED_ISLANDS_MODULE_ID) {
                return generateIslandsModule(scanIslands(root, appDir, islandsDir, routesDir));
            }
            return undefined;
        },
        transform(code, id) {
            const file = id.split("?")[0];
            if (!/\.[cm]?[tj]sx?$/.test(file) || !isIslandFile(file, routesPath, islandsPath))
                return undefined;
            return injectIslandId(code, islandIdForFile(file));
        },
        configureServer(server) {
            server.watcher.add([routesPath, islandsPath]);
            server.watcher.on("add", (file) => {
                if (file.startsWith(routesPath) || file.startsWith(islandsPath))
                    invalidateVirtualModules(server);
            });
            server.watcher.on("change", (file) => {
                if (file.startsWith(routesPath) || file.startsWith(islandsPath))
                    invalidateVirtualModules(server);
            });
            server.watcher.on("unlink", (file) => {
                if (file.startsWith(routesPath) || file.startsWith(islandsPath))
                    invalidateVirtualModules(server);
            });
        },
    };
}
export { otok };
export const __testing = {
    generateRoutesModule,
    injectIslandId,
    scanRoutes,
};
//# sourceMappingURL=index.js.map