import type { Plugin } from "vite";
import type { PluginContainer, ResolvedOtokConfig } from "@otok/config";
import { findOtokConfigFile, generateOtokConfigModule, importOtokConfigFile } from "./config-loader.js";

const RESOLVED_OTOK_CONFIG_MODULE_ID = "\0virtual:otok-config.ts";

export function isOtokConfigModule(id: string): boolean {
  return id === "virtual:otok-config" || id === RESOLVED_OTOK_CONFIG_MODULE_ID;
}

export function createPluginBridge(options: {
  container: PluginContainer | undefined;
  configModuleSource: string;
  virtualModules: Map<string, () => string | Promise<string>>;
}): Plugin {
  const resolvedVirtualIds = new Map<string, string>();

  for (const [id] of options.virtualModules) {
    resolvedVirtualIds.set(id, `\0${id}`);
  }

  return {
    name: "otok:plugins",
    enforce: "pre",
    resolveId(id) {
      if (id === "virtual:otok-config") return RESOLVED_OTOK_CONFIG_MODULE_ID;
      if (options.virtualModules.has(id)) return resolvedVirtualIds.get(id);
      return undefined;
    },
    async load(id) {
      if (id === RESOLVED_OTOK_CONFIG_MODULE_ID) return options.configModuleSource;
      for (const [virtualId, resolvedId] of resolvedVirtualIds) {
        if (id !== resolvedId) continue;
        const factory = options.virtualModules.get(virtualId);
        if (!factory) return undefined;
        return await factory();
      }
      return undefined;
    },
    configureServer(server) {
      if (!options.container) return;
      void options.container.runConfigureServer(server);
    },
  };
}

export async function loadResolvedOtokConfig(
  configFile: string | undefined,
  root: string,
  mode: "development" | "production" | "test",
  command: "build" | "serve",
): Promise<{ container?: PluginContainer; resolved: ResolvedOtokConfig; configModuleSource: string }> {
  const { PluginContainer: Container, resolveOtokConfig } = await import("@otok/config");

  const discovered = findOtokConfigFile(root, configFile);
  const configModuleSource = generateOtokConfigModule(discovered, root);

  if (!discovered) {
    const resolved = await resolveOtokConfig({}, { root, mode, command });
    return { resolved, configModuleSource };
  }

  const userConfig = await importOtokConfigFile(discovered);
  const container = new Container(userConfig as import("@otok/config").OtokUserConfig, { root, mode, command });
  const resolved = await container.resolve();

  return {
    container,
    resolved,
    configModuleSource,
  };
}

export { RESOLVED_OTOK_CONFIG_MODULE_ID };
