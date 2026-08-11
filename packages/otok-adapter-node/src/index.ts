import fs from "node:fs";
import path from "node:path";
import {
  createDualBuildVitePlugin,
  defineAdapter,
  type AdapterBuildContext,
  type OtokAdapterServerEntry,
} from "@otok/config";

export interface NodeAdapterOptions {
  /** Output root directory. Defaults to `dist`. */
  outDir?: string;
  /** Default bind host when the generated server starts. Overridable via `HOST`. */
  host?: string;
  /** Default port when the generated server starts. Overridable via `PORT`. */
  port?: number;
  /** Project-relative server entry. When omitted, the adapter generates one at build time. */
  serverEntry?: string;
  /** Cache-Control header for hashed static assets. */
  assetCacheControl?: string;
  /**
   * When true, the generated server wires `RedisCacheProvider` from
   * `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `OTOK_REDIS_REST_*`).
   */
  redisCache?: boolean;
}

const NODE_CAPABILITIES = [
  "node-apis",
  "filesystem",
  "process-env",
  "graceful-shutdown",
  "ssr",
  "streaming",
  "middleware",
  "server-actions",
  "islands",
  "static-assets",
] as const;

const DEFAULT_OUT_DIR = "dist";
const GENERATED_SERVER_ENTRY = "src/otok.generated.server.ts";

function outputDirs(options: NodeAdapterOptions) {
  const root = options.outDir ?? DEFAULT_OUT_DIR;
  return {
    root,
    client: path.posix.join(root, "client"),
    server: path.posix.join(root, "server"),
  };
}

function generatedServerSource(options: NodeAdapterOptions): string {
  const outDirs = outputDirs(options);
  const port = options.port ?? 3000;
  const host = options.host ?? "0.0.0.0";
  const cacheControl = options.assetCacheControl ?? "public, max-age=31536000, immutable";
  const redisCache = options.redisCache === true;

  const redisBootstrap = redisCache
    ? `
import { setCacheProvider, RedisCacheProvider, createRedisRestClient } from "otok/cache";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.OTOK_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.OTOK_REDIS_REST_TOKEN;
if (redisUrl && redisToken) {
  setCacheProvider(new RedisCacheProvider({
    client: createRedisRestClient({ url: redisUrl, token: redisToken }),
  }));
}
`
    : "";

  return `import { serve } from "@hono/node-server";
import { createOtokAppAsync, readOtokManifest } from "otok/server";
import { loadOtokResolvedConfig } from "virtual:otok-config";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";
${redisBootstrap}
const { runtime, applyAppPlugins, collectPluginRoutes, transformHtml } = await loadOtokResolvedConfig();
const pluginRoutes = await collectPluginRoutes();

const app = await createOtokAppAsync({
  routes: [...routes, ...(pluginRoutes as typeof routes)],
  notFoundRoute,
  errorRoute,
  ...runtime,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: ${JSON.stringify("src/client.ts")},
  devClientEntry: "/src/client.ts",
  devStylesheets: ["/src/styles.css"],
  staticDir: ${JSON.stringify(`./${outDirs.client}`)},
  assetCacheControl: ${JSON.stringify(cacheControl)},
  health: { ok: true, runtime: "node", adapter: "otok-adapter-node" },
  transformHtml,
  configure: (app) => applyAppPlugins(app),
  theme: runtime.theme ?? true,
});

export default app;

if (import.meta.env.PROD) {
  const port = Number(process.env.PORT ?? ${JSON.stringify(String(port))});
  const hostname = process.env.HOST ?? ${JSON.stringify(host)};
  const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.info(\`Otok server listening on http://\${info.address}:\${info.port}\`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.info(\`Received \${signal}; shutting down Otok server...\`);
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
`;
}

async function writeGeneratedServer(ctx: AdapterBuildContext, options: NodeAdapterOptions): Promise<void> {
  if (options.serverEntry) return;

  const target = path.resolve(ctx.root, GENERATED_SERVER_ENTRY);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, generatedServerSource(options));
}

const nodeAdapterFactory = defineAdapter<NodeAdapterOptions>({
  name: "otok-adapter-node",
  runtime: "node",
  capabilities: NODE_CAPABILITIES,
  build: {
    clientEntry: "src/client.ts",
    ssrEntry: GENERATED_SERVER_ENTRY,
    ssrTarget: "node",
    clientManifest: true,
  },
  outputDirs(options, _root) {
    return outputDirs(options);
  },
  async serverEntry(ctx) {
    const options = ctx.options as NodeAdapterOptions;
    const entry = options.serverEntry ?? GENERATED_SERVER_ENTRY;
    return {
      path: entry,
      generated: !options.serverEntry,
    };
  },
  assets: {
    cacheControl: "public, max-age=31536000, immutable",
    assetsPath: "/assets",
  },
  environment: {
    processEnv: true,
  },
  ssr: {
    supported: true,
    streaming: true,
  },
  middleware: {
    supported: true,
  },
  prerender: {
    supported: false,
  },
  hooks: {
    async buildStart(ctx) {
      const options = ctx.adapter.options as NodeAdapterOptions;
      await writeGeneratedServer(ctx, options);
    },
    async buildEnd(ctx) {
      if (!ctx.isSsrBuild) return;
      const options = ctx.adapter.options as NodeAdapterOptions;
      await writeGeneratedServer(ctx, options);
    },
  },
  configureVite(ctx) {
    const options = ctx.options as NodeAdapterOptions;
    const outDirs = outputDirs(options);
    const serverEntry = options.serverEntry ?? GENERATED_SERVER_ENTRY;

    return createDualBuildVitePlugin({
      name: "otok-adapter-node",
      outDirs,
      build: {
        clientEntry: "src/client.ts",
        ssrEntry: serverEntry,
        ssrTarget: "node",
        clientManifest: true,
      },
    });
  },
});

/** Node.js adapter with standalone server output, static assets, and graceful shutdown. */
export default function node(options: NodeAdapterOptions = {}) {
  const adapter = nodeAdapterFactory(options);
  adapter.build = {
    ...adapter.build,
    ssrEntry: options.serverEntry ?? GENERATED_SERVER_ENTRY,
  };
  return adapter;
}

export { node, nodeAdapterFactory, GENERATED_SERVER_ENTRY, generatedServerSource, outputDirs as nodeOutputDirs };
