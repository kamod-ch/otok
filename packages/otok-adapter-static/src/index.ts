import fs from "node:fs";
import path from "node:path";
import { adapterError, createDualBuildVitePlugin, defineAdapter, type AdapterBuildContext } from "@kamod-ch/otok-config";
import { collectPrerenderEntries, scanRenderingFromSource } from "@kamod-ch/otok/rendering";

export interface StaticAdapterOptions {
  outDir?: string;
  /** Additional route paths to prerender beyond statically known routes. */
  routes?: string[];
  /** Use absolute asset URLs in prerendered HTML. */
  absoluteAssets?: boolean;
  /** Use relative asset URLs for generic static hosts. Defaults to true. */
  relativeAssets?: boolean;
  /** Fail the build when route modules export server-only features. */
  strict?: boolean;
  /** Directory name for prerendered HTML inside the output root. */
  staticDir?: string;
}

const STATIC_CAPABILITIES = ["prerender", "islands", "static-assets"] as const;

const DEFAULT_OUT_DIR = "dist";
const GENERATED_PRERENDER_ENTRY = "src/otok.generated.prerender.ts";

function outputDirs(options: StaticAdapterOptions) {
  const root = options.outDir ?? DEFAULT_OUT_DIR;
  const staticRoot = options.staticDir ?? root;
  return {
    root,
    client: path.posix.join(root, "client"),
    server: path.posix.join(root, "server"),
    static: staticRoot,
  };
}

function walkRoutes(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkRoutes(fullPath));
    } else if (/\.[cm]?[tj]sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function validateStaticRoutes(ctx: AdapterBuildContext, options: StaticAdapterOptions): void {
  if (options.strict === false) return;

  const routesDir = path.resolve(ctx.root, "src/app/routes");
  const files = walkRoutes(routesDir);
  const violations: string[] = [];

  for (const file of files) {
    const base = path.basename(file).replace(/\.[cm]?[tj]sx?$/, "");
    if (base.startsWith("_")) continue;
    const source = fs.readFileSync(file, "utf8");
    if (/\bexport\s+(async\s+)?function\s+action\b/.test(source)) {
      violations.push(`${path.relative(ctx.root, file)}: action`);
    }
    if (/\bexport\s+(async\s+)?function\s+loader\b/.test(source)) {
      violations.push(`${path.relative(ctx.root, file)}: loader`);
    }
  }

  if (violations.length > 0) {
    throw adapterError(
      "otok-adapter-static",
      `Cannot prerender routes with server functions. Remove actions/loaders or disable strict mode. ${violations.join(", ")}`,
    );
  }
}

function generatedPrerenderServerSource(): string {
  return `import { createOtokApp, readOtokManifest } from "@kamod-ch/otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const { runtime, applyAppPlugins } = await loadOtokResolvedConfig();

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  health: false,
  theme: runtime.theme ?? true,
  configure: (app) => {
    void applyAppPlugins(app);
  },
});

export default app;
`;
}

function routePathToFile(routePath: string): string {
  if (routePath === "/") return "index.html";
  return `${routePath.replace(/^\//, "").replace(/\/$/, "")}/index.html`;
}

async function prerenderRoutes(ctx: AdapterBuildContext, options: StaticAdapterOptions): Promise<void> {
  const outDirs = outputDirs(options);
  const serverFile = path.resolve(ctx.root, outDirs.server ?? "", "server.js");
  if (!fs.existsSync(serverFile)) {
    throw adapterError("otok-adapter-static", `Missing SSR bundle at ${serverFile}. Run the full build first.`);
  }

  const serverDir = path.dirname(serverFile);
  const moduleUrl = pathToFileURL(serverFile).href;
  const mod = (await import(moduleUrl)) as { default: { fetch: typeof fetch } };
  const app = mod.default;

  const manifestPath = path.resolve(ctx.root, outDirs.client, ".vite/manifest.json");
  const routeManifestPath = path.resolve(serverDir, "otok-prerender-routes.json");
  const discovered = fs.existsSync(routeManifestPath)
    ? (JSON.parse(fs.readFileSync(routeManifestPath, "utf8")) as string[])
    : [];

  const configured = options.routes ?? [];
  const paths = [...new Set([...discovered, ...configured, "/"])];

  for (const routePath of paths) {
    const response = await app.fetch(new Request(`http://otok.local${routePath}`));
    if (!response.ok) {
      throw adapterError(
        "otok-adapter-static",
        `Failed to prerender ${routePath}: ${response.status} ${response.statusText}`,
      );
    }

    let html = await response.text();
    if (options.relativeAssets !== false) {
      html = html.replace(/(\s(?:src|href)=["'])\//g, '$1./');
    } else if (options.absoluteAssets) {
      html = html.replace(/(\s(?:src|href)=["'])\//g, '$1/');
    }

    const target = path.resolve(ctx.root, outDirs.static ?? outDirs.root, routePathToFile(routePath));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  }

  if (fs.existsSync(manifestPath)) {
    const assetsTarget = path.resolve(ctx.root, outDirs.static ?? outDirs.root, outDirs.client);
    fs.cpSync(path.resolve(ctx.root, outDirs.client), assetsTarget, { recursive: true });
  }
}

function pathToFileURL(filePath: string): URL {
  return new URL(`file://${filePath}`);
}

async function writePrerenderEntry(ctx: AdapterBuildContext): Promise<void> {
  const target = path.resolve(ctx.root, GENERATED_PRERENDER_ENTRY);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, generatedPrerenderServerSource());
}

const staticAdapterFactory = defineAdapter<StaticAdapterOptions>({
  name: "otok-adapter-static",
  runtime: "static",
  capabilities: STATIC_CAPABILITIES,
  build: {
    clientEntry: "src/client.ts",
    ssrEntry: GENERATED_PRERENDER_ENTRY,
    ssrTarget: "node",
    clientManifest: true,
  },
  outputDirs(options, _root) {
    return outputDirs(options);
  },
  serverEntry(ctx) {
    return { path: GENERATED_PRERENDER_ENTRY, generated: true };
  },
  assets: {
    relativeUrls: true,
    absoluteUrls: false,
  },
  environment: {
    processEnv: false,
  },
  ssr: {
    supported: false,
  },
  middleware: {
    supported: false,
  },
  prerender: {
    supported: true,
    strict: true,
  },
  hooks: {
    async buildStart(ctx) {
      const options = ctx.adapter.options as StaticAdapterOptions;
      validateStaticRoutes(ctx, options);
      await writePrerenderEntry(ctx);
    },
    async buildEnd(ctx) {
      if (ctx.isSsrBuild) {
        const outDirs = outputDirs(ctx.adapter.options as StaticAdapterOptions);
        const routesDir = path.resolve(ctx.root, "src/app/routes");
        const patterns = await collectPrerenderPaths(routesDir);
        const outFile = path.resolve(ctx.root, outDirs.server ?? "", "otok-prerender-routes.json");
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, JSON.stringify(patterns, null, 2));
      }
    },
    async finish(ctx) {
      const options = ctx.adapter.options as StaticAdapterOptions;
      await prerenderRoutes(ctx, options);
    },
    async cleanup(ctx) {
      const outDirs = outputDirs(ctx.adapter.options as StaticAdapterOptions);
      const serverDir = path.resolve(ctx.root, outDirs.server ?? "");
      if (fs.existsSync(serverDir)) {
        fs.rmSync(serverDir, { recursive: true, force: true });
      }
    },
  },
  configureVite(ctx) {
    const options = ctx.options as StaticAdapterOptions;
    const outDirs = outputDirs(options);

    return createDualBuildVitePlugin({
      name: "otok-adapter-static",
      outDirs,
      build: {
        clientEntry: "src/client.ts",
        ssrEntry: GENERATED_PRERENDER_ENTRY,
        ssrTarget: "node",
        clientManifest: true,
      },
    });
  },
});

function collectPrerenderRouteInputs(routesDir: string) {
  const files = walkRoutes(routesDir).filter((file) => {
    const base = path.basename(file).replace(/\.[cm]?[tj]sx?$/, "");
    return !base.startsWith("_") && !base.startsWith("$");
  });

  return files.map((file) => {
    const relative = path.relative(routesDir, file).replace(/\.[cm]?[tj]sx?$/, "");
    const segments = relative
      .split(path.sep)
      .filter((segment) => segment !== "index" && !/^\(.+\)$/.test(segment));
    const routePattern = `/${segments.join("/")}`.replace(/\/$/, "") || "/";
    const source = fs.readFileSync(file, "utf8");
    return {
      routePattern,
      routePath: routePattern.replace(/\[\.\.\.([^\]]+)\]/g, ":$1*").replace(/\[\[([^\]]+)\]\]/g, ":$1").replace(/\[([^\]]+)\]/g, ":$1"),
      file,
      rendering: scanRenderingFromSource(source),
    };
  });
}

async function collectPrerenderPaths(routesDir: string): Promise<string[]> {
  const inputs = collectPrerenderRouteInputs(routesDir);
  const manifest = await collectPrerenderEntries(inputs);
  return manifest.entries.map((entry) => entry.path);
}

/** Static hosting adapter that prerenders known routes at build time. */
export default function staticAdapter(options: StaticAdapterOptions = {}) {
  const adapter = staticAdapterFactory(options);
  adapter.prerender = {
    supported: true,
    routes: options.routes,
    strict: options.strict ?? true,
  };
  adapter.assets = {
    relativeUrls: options.relativeAssets !== false,
    absoluteUrls: options.absoluteAssets ?? false,
  };
  return adapter;
}

export {
  staticAdapter as static,
  staticAdapterFactory,
  GENERATED_PRERENDER_ENTRY,
  outputDirs as staticOutputDirs,
  collectPrerenderPaths,
  collectPrerenderRouteInputs,
};
