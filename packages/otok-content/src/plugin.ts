import path from "node:path";
import { pathToFileURL } from "node:url";
import { definePlugin } from "otok";
import { buildContentManifest } from "./core/load-entries.js";
import { createRegistry } from "./core/registry.js";
import type { CollectionDefinition, ContentManifest } from "./core/types.js";
import {
  DEFAULT_CONTENT_OPTIONS,
  MANIFEST_VIRTUAL_ID,
  normalizeContentOptions,
  type ContentPluginOptions,
} from "./plugin/options.js";

const contentPluginFactory = definePlugin<ContentPluginOptions>({
  name: "@kamod-ch/otok-content",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input != null && typeof input !== "object") {
        throw new Error("content() options must be an object");
      }
      const options = normalizeContentOptions((input ?? {}) as ContentPluginOptions);
      if (!options.collections && !options.config) {
        throw new Error("content() requires `collections` or `config` pointing to a content config module");
      }
      return options;
    },
  },
});

let runtimeManifest: ContentManifest | null = null;

export function getRuntimeContentManifest(): ContentManifest | null {
  return runtimeManifest;
}

async function loadCollectionsFromConfig(
  root: string,
  configPath: string,
): Promise<Record<string, CollectionDefinition>> {
  const abs = path.resolve(root, configPath);
  const mod = (await import(pathToFileURL(abs).href)) as {
    collections?: Record<string, CollectionDefinition>;
    default?: Record<string, CollectionDefinition>;
  };
  const collections = mod.collections ?? mod.default;
  if (!collections || typeof collections !== "object") {
    throw new Error(`otok-content: ${configPath} must export \`collections\``);
  }
  return collections;
}

function manifestModuleSource(manifest: ContentManifest): string {
  return `export const contentManifest = ${JSON.stringify(manifest)};`;
}

/**
 * Otok content plugin — typed markdown/mdx collections with build-time manifest.
 *
 * ```ts
 * import content from "@kamod-ch/otok-content/plugin";
 *
 * export default defineConfig({
 *   plugins: [content({ config: "./content.config.ts", origin: "https://example.com" })],
 * });
 * ```
 */
export default function content(options: ContentPluginOptions = {}) {
  const normalized = normalizeContentOptions(options);
  const plugin = contentPluginFactory(normalized);

  plugin.buildStart = async ({ root }) => {
    const contentRoot = path.resolve(root, normalized.root ?? DEFAULT_CONTENT_OPTIONS.root);
    const collectionsInput = normalized.collections
      ?? (normalized.config
        ? await loadCollectionsFromConfig(root, normalized.config)
        : {});

    const registry = createRegistry(collectionsInput);
    runtimeManifest = await buildContentManifest(registry.entries(), {
      root: contentRoot,
      includeDrafts: normalized.includeDrafts,
      mdx: normalized.mdx,
      gitDates: normalized.gitDates,
      incremental: normalized.incremental,
      locales: normalized.locales,
      defaultLocale: normalized.defaultLocale,
    });
  };

  if (normalized.live) {
    plugin.configureServer = ({ server, root }) => {
      const viteServer = server as {
        watcher: { add: (p: string) => void; on: (event: string, cb: (file: string) => void) => void };
      };
      const contentRoot = path.resolve(root, normalized.root ?? DEFAULT_CONTENT_OPTIONS.root);
      viteServer.watcher.add(contentRoot);
      viteServer.watcher.on("change", async (file: string) => {
        if (!file.startsWith(contentRoot)) return;
        const collectionsInput = normalized.collections
          ?? (normalized.config
            ? await loadCollectionsFromConfig(root, normalized.config!)
            : {});
        const registry = createRegistry(collectionsInput);
        runtimeManifest = await buildContentManifest(registry.entries(), {
          root: contentRoot,
          includeDrafts: normalized.includeDrafts,
          mdx: normalized.mdx,
          gitDates: normalized.gitDates,
          incremental: normalized.incremental,
          locales: normalized.locales,
          defaultLocale: normalized.defaultLocale,
        });
      });
    };
  }

  plugin.virtualModules = {
    manifest: () => {
      if (!runtimeManifest) {
        throw new Error("otok-content: manifest not built yet — buildStart must run first");
      }
      return manifestModuleSource(runtimeManifest);
    },
  };

  return plugin;
}

export { MANIFEST_VIRTUAL_ID, normalizeContentOptions };
export type { ContentPluginOptions };
