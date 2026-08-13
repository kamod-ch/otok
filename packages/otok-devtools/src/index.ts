import { definePlugin } from "@kamod-ch/otok";
import {
  createOtokDevtoolsBridge,
  getOtokDevtoolsBridge,
  setOtokDevtoolsBridge,
  type OtokDevtoolsSnapshot,
} from "@kamod-ch/otok/devtools";
import { registerDevtoolsApiRoutes } from "./server/api.js";
import { createDevtoolsVitePlugin } from "./vite/plugin.js";

export interface DevtoolsPluginOptions {
  /** API path for the devtools JSON feed. */
  endpoint?: string;
  /** Inject the floating panel in development. Defaults to true. */
  panel?: boolean;
}

export default definePlugin<DevtoolsPluginOptions>({
  name: "otok-devtools",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input !== undefined && typeof input !== "object") {
        throw new Error("options must be an object");
      }
      return input ?? {};
    },
  },
  config(options, ctx) {
    if (ctx.mode !== "development") return;
    return {
      devtools: {
        otok: {
          endpoint: options?.endpoint ?? "/__otok_devtools",
          panel: options?.panel ?? true,
        },
      },
    };
  },
  configResolved(ctx) {
    if (ctx.mode !== "development") return;
    if (!getOtokDevtoolsBridge()) {
      setOtokDevtoolsBridge(createOtokDevtoolsBridge());
    }
  },
  configureApp({ app, mode, config }) {
    if (mode !== "development") return;
    const devtoolsConfig = config.devtools?.otok as { endpoint?: string } | undefined;
    registerDevtoolsApiRoutes(app, devtoolsConfig?.endpoint ?? "/__otok_devtools");
  },
  configureVite(ctx) {
    if (ctx.mode !== "development") return;
    return createDevtoolsVitePlugin({
      endpoint: String(ctx.config.devtools?.otok && (ctx.config.devtools.otok as { endpoint?: string }).endpoint) ||
        "/__otok_devtools",
      panel:
        ctx.config.devtools?.otok && (ctx.config.devtools.otok as { panel?: boolean }).panel !== undefined
          ? Boolean((ctx.config.devtools.otok as { panel?: boolean }).panel)
          : true,
    });
  },
  virtualModules: {
    snapshot: () => {
      const bridge = getOtokDevtoolsBridge();
      const snapshot = bridge?.getSnapshot() ?? emptySnapshot();
      return `export const devtoolsSnapshot = ${JSON.stringify(snapshot)};`;
    },
  },
});

export { getOtokDevtoolsBridge, setOtokDevtoolsBridge, type OtokDevtoolsSnapshot };

function emptySnapshot(): OtokDevtoolsSnapshot {
  return {
    routes: [],
    plugins: [],
    middleware: [],
    loaders: [],
    pluginHooks: [],
    requests: [],
    updatedAt: Date.now(),
  };
}

export { createDevtoolsVitePlugin } from "./vite/plugin.js";
export { mountDevtoolsPanel } from "./client/mount.js";
