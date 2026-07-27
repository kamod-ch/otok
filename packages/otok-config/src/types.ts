import type { Hono } from "hono";
import type { Plugin, UserConfig as ViteUserConfig } from "vite";

export type OtokPluginFactory<TOptions = void> = [TOptions] extends [void]
  ? () => OtokPlugin
  : (options?: TOptions) => OtokPlugin;

export type OtokPluginInput = OtokPlugin | OtokPluginFactory;

export interface OtokRuntimeConfig {
  base?: string;
  clientEntry?: string;
  devClientEntry?: string;
  devStylesheets?: string[];
  staticDir?: string;
  assetsPath?: string;
  assetCacheControl?: string;
  health?: boolean | Record<string, unknown>;
  theme?: boolean;
  exposeErrorDetails?: boolean;
  streaming?: boolean;
}

export interface OtokUserConfig extends OtokRuntimeConfig {
  plugins?: OtokPluginInput[];
  vite?: ViteUserConfig | ((env: OtokConfigEnv) => ViteUserConfig | Promise<ViteUserConfig>);
  env?: Record<string, string | undefined>;
  /** @internal Reserved for generated deployment metadata. */
  adapter?: Record<string, unknown>;
  /** @internal Reserved for devtools integrations. */
  devtools?: Record<string, unknown>;
}

export interface OtokConfigEnv {
  mode: "development" | "production" | "test";
  command: "build" | "serve";
  root: string;
}

export interface PluginConfigContext {
  root: string;
  mode: OtokConfigEnv["mode"];
  command: OtokConfigEnv["command"];
  userConfig: OtokUserConfig;
}

export interface PluginResolvedContext extends PluginConfigContext {
  config: OtokUserConfig;
}

export interface BuildContext extends PluginResolvedContext {
  isSsrBuild: boolean;
}

export interface DevServerContext extends PluginResolvedContext {
  server: unknown;
}

export interface AppContext extends PluginResolvedContext {
  app: Hono;
}

export interface ViteContext extends PluginResolvedContext {
  viteConfig: ViteUserConfig;
}

export type VirtualModuleFactory = () => string | Promise<string>;

export interface ConfigSchema<T = unknown> {
  parse(input: unknown): T;
}

export interface EnvSchema {
  parse(input: Record<string, string | undefined>): Record<string, unknown>;
}

export interface OtokPlugin<TOptions = unknown> {
  name: string;
  version?: string;
  /** Validate plugin options before hooks run. */
  schema?: ConfigSchema<TOptions>;
  config?: (
    options: TOptions,
    ctx: PluginConfigContext,
  ) => Partial<OtokUserConfig> | void | Promise<Partial<OtokUserConfig> | void>;
  configResolved?: (ctx: PluginResolvedContext) => void | Promise<void>;
  buildStart?: (ctx: BuildContext) => void | Promise<void>;
  buildEnd?: (ctx: BuildContext) => void | Promise<void>;
  configureServer?: (ctx: DevServerContext) => void | Promise<void>;
  configureApp?: (ctx: AppContext) => void | Promise<void>;
  configureVite?: (ctx: ViteContext) => void | Plugin | Plugin[] | Promise<void | Plugin | Plugin[]>;
  virtualModules?: Record<string, VirtualModuleFactory>;
  envSchema?: EnvSchema;
  /** @internal Marker set by definePlugin factories. */
  __options?: TOptions;
}

export interface ResolvedOtokConfig {
  config: OtokUserConfig;
  runtime: OtokRuntimeConfig;
  applyAppPlugins: (app: Hono) => Promise<void>;
  env: Record<string, unknown>;
  virtualModules: Map<string, VirtualModuleFactory>;
  vitePlugins: Plugin[];
}

declare module "@otok/config" {
  interface OtokUserConfig {}
  interface OtokEnv {}
}
