import type { Hono } from "hono";
import type { Plugin } from "vite";
import {
  adapterToPlugin,
  resolveAdapter,
  runAdapterCleanup,
  runAdapterFinish,
} from "./adapter.js";
import type { ResolvedOtokAdapter } from "./adapter.js";
import { normalizePlugins } from "./define.js";
import { pluginError } from "./errors.js";
import { extractRuntimeConfig, mergeUserConfig, virtualModuleId } from "./merge.js";
import type {
  BuildContext,
  DevServerContext,
  HtmlTransformContext,
  OtokConfigEnv,
  OtokPlugin,
  OtokUserConfig,
  PluginConfigContext,
  PluginResolvedContext,
  ProgrammaticRouteDefinition,
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
  readonly adapter?: ResolvedOtokAdapter;
  config: OtokUserConfig;

  constructor(userConfig: OtokUserConfig, env: OtokConfigEnv) {
    this.env = env;
    this.adapter = resolveAdapter(userConfig.adapter, env.root);
    this.config = { ...userConfig, plugins: undefined, adapter: undefined };
    this.plugins = [
      ...(this.adapter ? [adapterToPlugin(this.adapter)] : []),
      ...normalizePlugins(userConfig.plugins),
    ];
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
      adapter: this.adapter,
    };
  }

  adapterBuildContext(isSsrBuild: boolean) {
    if (!this.adapter) return undefined;
    return {
      ...this.resolvedContext(),
      isSsrBuild,
      outDirs: this.adapter.outDirs,
      adapter: this.adapter,
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
    if (isSsrBuild) {
      await runAdapterFinish(ctx, this.adapter);
      await runAdapterCleanup(ctx, this.adapter);
    }
  }

  async runBuildCleanup(_isSsrBuild: boolean): Promise<void> {
    // Reserved for callers that need cleanup outside the default buildEnd flow.
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
      const result = plugin.configureApp?.(ctx);
      if (result && typeof (result as Promise<void>).then === "function") {
        await result;
      }
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

  async collectPluginRoutes(): Promise<ProgrammaticRouteDefinition[]> {
    const routes: ProgrammaticRouteDefinition[] = [];
    const ctx = this.resolvedContext();
    for (const plugin of this.plugins) {
      if (!plugin.registerRoutes) continue;
      const result = await plugin.registerRoutes(ctx);
      if (result?.length) routes.push(...result);
    }
    return routes;
  }

  async transformHtml(html: string, meta: { pathname: string; routeId?: string }): Promise<string> {
    let output = html;
    const ctx: HtmlTransformContext = {
      ...this.resolvedContext(),
      pathname: meta.pathname,
      routeId: meta.routeId,
    };
    for (const plugin of this.plugins) {
      if (!plugin.transformHtml) continue;
      output = await plugin.transformHtml(output, ctx);
    }
    return output;
  }

  async resolve(): Promise<ResolvedOtokConfig> {
    await this.runConfigHook();
    await this.runConfigResolvedHook();

    return {
      config: this.config,
      runtime: extractRuntimeConfig(this.config),
      adapter: this.adapter,
      applyAppPlugins: async (app: Hono) => {
        await this.runConfigureApp(app);
      },
      collectPluginRoutes: async () => this.collectPluginRoutes(),
      transformHtml: async (html, meta) => this.transformHtml(html, meta),
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
