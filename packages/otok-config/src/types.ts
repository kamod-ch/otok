import type { Hono } from "hono";
import type { Plugin, UserConfig as ViteUserConfig } from "vite";
import type { OtokAdapterInput, ResolvedOtokAdapter } from "./adapter.js";

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
  /** Deployment adapter (Node, Cloudflare, static, or custom). */
  adapter?: OtokAdapterInput;
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
  adapter?: ResolvedOtokAdapter;
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

/** Minimal route description plugins can register without file routes. */
export interface ProgrammaticRouteDefinition {
  id: string;
  /** Pathname pattern, e.g. `/api/plugin/hello` or `/admin/tools`. */
  path: string;
  /** Optional matcher; when omitted, a RegExp is derived from `path`. */
  pattern?: RegExp;
  /** Param names extracted from `path` (e.g. `:id`). */
  params?: string[];
  /**
   * Route module shape compatible with Otok file routes (`default`, `loader`, `action`, …).
   * Typed as unknown here to avoid a circular dependency on the `otok` package.
   */
  module: unknown;
  layouts?: unknown[];
  middleware?: unknown[];
}

export interface HtmlTransformContext extends PluginResolvedContext {
  pathname: string;
  routeId?: string;
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
  /**
   * Register additional routes (ADR 0007). Merged after file routes by the app bootstrap.
   */
  registerRoutes?: (
    ctx: PluginResolvedContext,
  ) => ProgrammaticRouteDefinition[] | void | Promise<ProgrammaticRouteDefinition[] | void>;
  /**
   * Transform buffered SSR HTML (ADR 0007). Not applied to streaming responses.
   */
  transformHtml?: (
    html: string,
    ctx: HtmlTransformContext,
  ) => string | Promise<string>;
  virtualModules?: Record<string, VirtualModuleFactory>;
  envSchema?: EnvSchema;
  /** @internal Marker set by definePlugin factories. */
  __options?: TOptions;
}

export interface ResolvedOtokConfig {
  config: OtokUserConfig;
  runtime: OtokRuntimeConfig;
  adapter?: ResolvedOtokAdapter;
  applyAppPlugins: (app: Hono) => Promise<void>;
  /** Collect programmatic routes from all plugins (ADR 0007). */
  collectPluginRoutes: () => Promise<ProgrammaticRouteDefinition[]>;
  /** Run plugin HTML transforms for buffered SSR (ADR 0007). */
  transformHtml: (
    html: string,
    meta: { pathname: string; routeId?: string },
  ) => Promise<string>;
  env: Record<string, unknown>;
  virtualModules: Map<string, VirtualModuleFactory>;
  vitePlugins: Plugin[];
}

declare module "@otok/config" {
  interface OtokUserConfig {}
  interface OtokEnv {}
}
