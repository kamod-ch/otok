import type { Hono } from "hono";
import type { Plugin } from "vite";
import { normalizePlugins } from "./define.js";
import { pluginError } from "./errors.js";
import { extractRuntimeConfig, mergeUserConfig, virtualModuleId } from "./merge.js";
import type {
  BuildContext,
  DevServerContext,
  OtokConfigEnv,
  OtokPlugin,
  OtokUserConfig,
  PluginConfigContext,
  PluginResolvedContext,
  ResolvedOtokConfig,
  VirtualModuleFactory,
} from "./types.js";

function assertUniquePluginNames(plugins: OtokPlugin[]): void {
  const seen = new Set<string>();
  for (const plugin of plugins) {
    if (!plugin.name) throw pluginError("config", "Every plugin must declare a unique name.");
    if (seen.has(plugin.name)) {
      throw pluginError("config", `Duplicate plugin name "${plugin.name}". Plugin names must be unique.`);
    }
    seen.add(plugin.name);
  }
}

function validatePluginOptions(plugin: OtokPlugin): void {
  if (!plugin.schema) return;
  try {
    plugin.schema.parse(plugin.__options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw pluginError(plugin.name, `Invalid plugin options: ${message}`);
  }
}

function collectVirtualModules(plugins: OtokPlugin[]): Map<string, VirtualModuleFactory> {
  const modules = new Map<string, VirtualModuleFactory>();
  for (const plugin of plugins) {
    if (!plugin.virtualModules) continue;
    for (const [moduleId, factory] of Object.entries(plugin.virtualModules)) {
      const id = virtualModuleId(plugin.name, moduleId);
      if (modules.has(id)) {
        throw pluginError(plugin.name, `Virtual module "${moduleId}" conflicts with another plugin module.`);
      }
      modules.set(id, factory);
    }
  }
  return modules;
}

function parseEnvSchemas(
  config: OtokUserConfig,
  plugins: OtokPlugin[],
): Record<string, unknown> {
  const raw = { ...process.env, ...config.env };
  const parsed: Record<string, unknown> = {};

  for (const plugin of plugins) {
    if (!plugin.envSchema) continue;
    Object.assign(parsed, plugin.envSchema.parse(raw));
  }

  return parsed;
}

export class PluginContainer {
  readonly plugins: OtokPlugin[];
  readonly env: OtokConfigEnv;
  config: OtokUserConfig;

  constructor(userConfig: OtokUserConfig, env: OtokConfigEnv) {
    this.env = env;
    this.config = { ...userConfig, plugins: undefined };
    this.plugins = normalizePlugins(userConfig.plugins);
    assertUniquePluginNames(this.plugins);
    for (const plugin of this.plugins) {
      validatePluginOptions(plugin);
    }
  }

  private baseContext(): PluginConfigContext {
    return {
      root: this.env.root,
      mode: this.env.mode,
      command: this.env.command,
      userConfig: this.config,
    };
  }

  async runConfigHook(): Promise<void> {
    for (const plugin of this.plugins) {
      if (!plugin.config) continue;
      const patch = await plugin.config(plugin.__options as never, this.baseContext());
      if (patch) {
        this.config = mergeUserConfig(this.config, patch);
      }
    }
  }

  async runConfigResolvedHook(): Promise<void> {
    const ctx = this.resolvedContext();
    for (const plugin of this.plugins) {
      await plugin.configResolved?.(ctx);
    }
  }

  resolvedContext(): PluginResolvedContext {
    return {
      ...this.baseContext(),
      config: this.config,
    };
  }

  async runBuildStart(isSsrBuild: boolean): Promise<void> {
    const ctx: BuildContext = { ...this.resolvedContext(), isSsrBuild };
    for (const plugin of this.plugins) {
      await plugin.buildStart?.(ctx);
    }
  }

  async runBuildEnd(isSsrBuild: boolean): Promise<void> {
    const ctx: BuildContext = { ...this.resolvedContext(), isSsrBuild };
    for (let index = this.plugins.length - 1; index >= 0; index -= 1) {
      await this.plugins[index]?.buildEnd?.(ctx);
    }
  }

  async runConfigureServer(server: DevServerContext["server"]): Promise<void> {
    const ctx: DevServerContext = { ...this.resolvedContext(), server };
    for (const plugin of this.plugins) {
      await plugin.configureServer?.(ctx);
    }
  }

  async runConfigureApp(app: Hono): Promise<void> {
    const ctx = { ...this.resolvedContext(), app };
    for (const plugin of this.plugins) {
      await plugin.configureApp?.(ctx);
    }
  }

  async collectVitePlugins(): Promise<Plugin[]> {
    const collected: Plugin[] = [];
    for (const plugin of this.plugins) {
      if (!plugin.configureVite) continue;
      const result = await plugin.configureVite({
        ...this.resolvedContext(),
        viteConfig: {},
      });
      if (!result) continue;
      if (Array.isArray(result)) {
        collected.push(...result);
      } else if (typeof result === "object" && "name" in result) {
        collected.push(result);
      }
    }
    return collected;
  }

  async resolve(): Promise<ResolvedOtokConfig> {
    await this.runConfigHook();
    await this.runConfigResolvedHook();

    return {
      config: this.config,
      runtime: extractRuntimeConfig(this.config),
      applyAppPlugins: async (app: Hono) => {
        await this.runConfigureApp(app);
      },
      env: parseEnvSchemas(this.config, this.plugins),
      virtualModules: collectVirtualModules(this.plugins),
      vitePlugins: await this.collectVitePlugins(),
    };
  }
}

export async function resolveOtokConfig(
  userConfig: OtokUserConfig,
  env: OtokConfigEnv,
): Promise<ResolvedOtokConfig> {
  const container = new PluginContainer(userConfig, env);
  return container.resolve();
}
