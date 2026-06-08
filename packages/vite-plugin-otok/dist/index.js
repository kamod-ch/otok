import fs from "node:fs";
import path from "node:path";
import { normalizePath } from "vite";
const ROUTES_MODULE_ID = "virtual:otok-routes";
const ISLANDS_MODULE_ID = "virtual:otok-islands";
const RESOLVED_ROUTES_MODULE_ID = `\0${ROUTES_MODULE_ID}`;
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
function segmentToRoute(segment) {
    if (segment === "index")
        return undefined;
    if (segment.startsWith("_"))
        return undefined;
    const match = /^\[([^\]]+)\]$/.exec(segment);
    if (match)
        return { part: `:${match[1]}`, param: match[1], dynamic: true };
    return { part: segment, dynamic: false };
}
function routeFileToEntry(file, routesDir) {
    const relative = normalizePath(path.relative(routesDir, stripExtension(file)));
    const segments = relative.split("/");
    const params = [];
    const routeParts = [];
    let dynamicCount = 0;
    for (const segment of segments) {
        const converted = segmentToRoute(segment);
        if (!converted)
            continue;
        routeParts.push(converted.part);
        if (converted.param)
            params.push(converted.param);
        if (converted.dynamic)
            dynamicCount += 1;
    }
    const routePath = `/${routeParts.join("/")}`.replace(/\/$/, "") || "/";
    const patternParts = routeParts.map((part) => part.startsWith(":") ? "([^/]+)" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = `^/${patternParts.join("/")}/?$`;
    const staticCount = routeParts.length - dynamicCount;
    return {
        id: relative.replaceAll("/", "."),
        file,
        routePath,
        pattern,
        params,
        score: staticCount * 10 - dynamicCount,
    };
}
function scanRoutes(root, routesDir) {
    const absoluteRoutesDir = path.resolve(root, routesDir);
    return walk(absoluteRoutesDir)
        .filter((file) => !path.basename(file).startsWith("$"))
        .map((file) => routeFileToEntry(file, absoluteRoutesDir))
        .filter((entry) => Boolean(entry))
        .sort((a, b) => b.score - a.score || a.routePath.localeCompare(b.routePath));
}
function scanIslands(root, appDir, islandsDir, routesDir) {
    const absoluteIslandsDir = path.resolve(root, islandsDir);
    const absoluteRoutesDir = path.resolve(root, routesDir);
    const files = [
        ...walk(absoluteIslandsDir),
        ...walk(absoluteRoutesDir).filter((file) => path.basename(file).startsWith("$")),
    ];
    const seen = new Set();
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
function generateRoutesModule(routes) {
    const imports = routes.map((route, index) => `import * as route${index} from "${modulePath(route.file)}";`);
    const entries = routes.map((route, index) => `{
    id: ${JSON.stringify(route.id)},
    path: ${JSON.stringify(route.routePath)},
    pattern: new RegExp(${JSON.stringify(route.pattern)}),
    params: ${JSON.stringify(route.params)},
    module: route${index}
  }`);
    return `${imports.join("\n")}

export const routes = [
  ${entries.join(",\n  ")}
];
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
function invalidateVirtualModules(server) {
    for (const id of [ROUTES_MODULE_ID, ISLANDS_MODULE_ID]) {
        const mod = server.moduleGraph.getModuleById(`\0${id}`);
        if (mod)
            server.moduleGraph.invalidateModule(mod);
    }
}
export default function otok(options = {}) {
    const appDir = options.appDir ?? "src/app";
    const routesDir = options.routesDir ?? path.join(appDir, "routes");
    const islandsDir = options.islandsDir ?? path.join(appDir, "islands");
    let root = process.cwd();
    return {
        name: "otok",
        enforce: "pre",
        configResolved(config) {
            root = config.root;
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
        configureServer(server) {
            const routesPath = path.resolve(root, routesDir);
            const islandsPath = path.resolve(root, islandsDir);
            server.watcher.add([routesPath, islandsPath]);
            server.watcher.on("add", (file) => {
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
//# sourceMappingURL=index.js.map