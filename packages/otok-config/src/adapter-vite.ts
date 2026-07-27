import type { Plugin, UserConfig } from "vite";
import type { OtokAdapterBuildSetup, OtokAdapterOutputDirs } from "./adapter.js";

export interface DualBuildViteOptions {
  name: string;
  outDirs: OtokAdapterOutputDirs;
  build?: OtokAdapterBuildSetup;
}

/** Vite plugin that switches client vs SSR build settings using `--mode client`. */
export function createDualBuildVitePlugin(options: DualBuildViteOptions): Plugin {
  const clientEntry = options.build?.clientEntry ?? "src/client.ts";
  const serverEntry = options.build?.ssrEntry ?? "src/server.ts";
  const ssrTarget = options.build?.ssrTarget ?? "node";
  const bundleDeps = options.build?.bundleDeps ?? false;

  return {
    name: `${options.name}:vite`,
    config(_userConfig, env): UserConfig {
      const isClient = env.mode === "client";

      if (isClient) {
        return {
          build: {
            outDir: options.outDirs.client,
            manifest: options.build?.clientManifest ?? true,
            emptyOutDir: true,
            rollupOptions: {
              input: clientEntry,
              output: {
                entryFileNames: "assets/[name]-[hash].js",
                chunkFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
              },
            },
          },
        };
      }

      return {
        build: {
          outDir: options.outDirs.server ?? `${options.outDirs.root}/server`,
          ssr: serverEntry,
          emptyOutDir: true,
          target: ssrTarget === "webworker" ? "es2022" : undefined,
          rollupOptions: {
            output: {
              entryFileNames: "server.js",
              format: "es",
            },
          },
        },
        ssr: {
          target: ssrTarget,
          noExternal: bundleDeps ? true : undefined,
        },
      };
    },
  };
}

export function dualBuildScripts(): Record<string, string> {
  return {
    "build:client": "vite build --mode client",
    "build:server": "vite build",
    build: "pnpm run build:client && pnpm run build:server",
  };
}
