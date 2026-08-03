import type { Plugin } from "vite";
import { OtokConfigError } from "./errors.js";
import type {
  BuildContext,
  EnvSchema,
  OtokPlugin,
  PluginResolvedContext,
  ViteContext,
} from "./types.js";

/** Supported deployment runtimes. Custom adapters may extend with string literals. */
export type OtokRuntime = "node" | "cloudflare" | "static" | (string & {});

/** Runtime capabilities exposed by an adapter for plugin compatibility checks. */
export const OTOK_ADAPTER_CAPABILITIES = [
  "node-apis",
  "filesystem",
  "process-env",
  "graceful-shutdown",
  "ssr",
  "streaming",
  "middleware",
  "server-actions",
  "islands",
  "prerender",
  "env-bindings",
  "static-assets",
  "worker-fetch",
] as const;

export type OtokAdapterCapability = (typeof OTOK_ADAPTER_CAPABILITIES)[number];

export interface OtokAdapterOutputDirs {
  /** Project-relative output root (e.g. `dist`). */
  root: string;
  /** Hashed client assets and Vite manifest. */
  client: string;
  /** SSR / worker bundle directory when applicable. */
  server?: string;
  /** Prerendered HTML output for static hosting. */
  static?: string;
}

export interface OtokAdapterBuildSetup {
  clientOutDir?: string;
  serverOutDir?: string;
  ssrEntry?: string;
  clientEntry?: string;
  ssrTarget?: "node" | "webworker";
  /** Bundle framework deps into the server/worker output. */
  bundleDeps?: boolean;
  clientManifest?: boolean;
}

export interface OtokAdapterServerEntry {
  /** Project-relative server entry consumed by the SSR build. */
  path: string;
  /** When true, the adapter writes this file during `buildEnd`. */
  generated?: boolean;
}

export interface OtokAdapterAssetHandling {
  cacheControl?: string;
  assetsPath?: string;
  /** Emit absolute asset URLs in prerendered HTML. */
  absoluteUrls?: boolean;
  /** Emit relative asset URLs for generic static hosts. */
  relativeUrls?: boolean;
}

export interface OtokAdapterEnvironment {
  processEnv?: boolean;
  bindings?: boolean;
  schema?: EnvSchema;
}

export interface OtokAdapterPrerender {
  supported: boolean;
  routes?: string[];
  dynamicRoutes?: string[];
  /** Fail the build when server-only route features are detected. */
  strict?: boolean;
}

export interface OtokAdapterSsr {
  supported: boolean;
  streaming?: boolean;
}

export interface OtokAdapterMiddleware {
  supported: boolean;
}

export interface AdapterBuildContext extends PluginResolvedContext {
  isSsrBuild: boolean;
  outDirs: OtokAdapterOutputDirs;
  adapter: ResolvedOtokAdapter;
}

export interface OtokAdapterHooks {
  buildStart?: (ctx: AdapterBuildContext) => void | Promise<void>;
  buildEnd?: (ctx: AdapterBuildContext) => void | Promise<void>;
  cleanup?: (ctx: AdapterBuildContext) => void | Promise<void>;
  finish?: (ctx: AdapterBuildContext) => void | Promise<void>;
}

export interface OtokAdapter<TOptions = unknown> {
  /** Package name, e.g. `otok-adapter-node`. */
  name: string;
  runtime: OtokRuntime;
  capabilities: readonly OtokAdapterCapability[];
  build?: OtokAdapterBuildSetup;
  outputDirs(options: TOptions, root: string): OtokAdapterOutputDirs;
  serverEntry?(
    ctx: AdapterBuildContext & { options: TOptions },
  ): OtokAdapterServerEntry | Promise<OtokAdapterServerEntry>;
  assets?: OtokAdapterAssetHandling;
  environment?: OtokAdapterEnvironment;
  prerender?: OtokAdapterPrerender;
  ssr?: OtokAdapterSsr;
  middleware?: OtokAdapterMiddleware;
  hooks?: OtokAdapterHooks;
  configureVite?(
    ctx: ViteContext & { options: TOptions; isSsrBuild: boolean },
  ): void | Plugin | Plugin[] | Promise<void | Plugin | Plugin[]>;
  /** @internal Options passed to the adapter factory. */
  __options?: TOptions;
}

export interface ResolvedOtokAdapter<TOptions = unknown> {
  adapter: OtokAdapter<TOptions>;
  options: TOptions;
  outDirs: OtokAdapterOutputDirs;
  capabilities: ReadonlySet<OtokAdapterCapability>;
}

export type OtokAdapterFactory<TOptions = void> = [TOptions] extends [void]
  ? () => OtokAdapter<TOptions>
  : (options?: TOptions) => OtokAdapter<TOptions>;

export type OtokAdapterInput = OtokAdapter<any> | OtokAdapterFactory<any>;

export function adapterError(adapterName: string, message: string): OtokConfigError {
  return new OtokConfigError(`[otok:adapter:${adapterName}] ${message}`);
}

export function defineAdapter<TOptions = void>(
  setup: Omit<OtokAdapter<TOptions>, "__options">,
): OtokAdapterFactory<TOptions> {
  const factory = ((options?: TOptions) => ({
    ...setup,
    __options: options as TOptions,
  })) as OtokAdapterFactory<TOptions>;

  return factory;
}

export function isAdapterFactory(input: OtokAdapterInput): input is OtokAdapterFactory {
  return typeof input === "function";
}

export function instantiateAdapter(input: OtokAdapterInput, options?: unknown): OtokAdapter {
  if (isAdapterFactory(input)) {
    const factory = input as (options?: unknown) => OtokAdapter;
    return factory(options);
  }
  return input as OtokAdapter;
}

export function normalizeAdapter(input: OtokAdapterInput | undefined): OtokAdapter | undefined {
  if (!input) return undefined;
  return instantiateAdapter(input);
}

function capabilitySet(adapter: OtokAdapter): ReadonlySet<OtokAdapterCapability> {
  return new Set(adapter.capabilities);
}

export function resolveAdapter(
  input: OtokAdapterInput | undefined,
  root: string,
): ResolvedOtokAdapter | undefined {
  const adapter = normalizeAdapter(input);
  if (!adapter) return undefined;

  const options = (adapter.__options ?? {}) as unknown;
  const outDirs = adapter.outputDirs(options, root);

  return {
    adapter,
    options,
    outDirs,
    capabilities: capabilitySet(adapter),
  };
}

export function hasAdapterCapability(
  resolved: ResolvedOtokAdapter | undefined,
  capability: OtokAdapterCapability,
): boolean {
  return resolved?.capabilities.has(capability) ?? false;
}

export function assertAdapterCapability(
  resolved: ResolvedOtokAdapter | undefined,
  capability: OtokAdapterCapability,
  reason: string,
): void {
  if (hasAdapterCapability(resolved, capability)) return;

  const runtime = resolved?.adapter.runtime ?? "unknown";
  const adapterName = resolved?.adapter.name ?? "none";
  throw adapterError(
    adapterName,
    `${reason} Requires capability "${capability}" but the active adapter (${adapterName}, runtime "${runtime}") does not provide it.`,
  );
}

export function adapterBuildContext(
  ctx: BuildContext,
  resolved: ResolvedOtokAdapter,
): AdapterBuildContext {
  return {
    ...ctx,
    adapter: resolved,
    outDirs: resolved.outDirs,
  };
}

/** Converts an adapter into an Otok plugin so hooks participate in the plugin lifecycle. */
export function adapterToPlugin(resolved: ResolvedOtokAdapter): OtokPlugin {
  const { adapter } = resolved;

  return {
    name: adapter.name,
    envSchema: adapter.environment?.schema,
    configureVite(ctx) {
      if (!adapter.configureVite) return undefined;
      return adapter.configureVite({
        ...ctx,
        options: resolved.options,
        isSsrBuild: ctx.mode === "production" && ctx.command === "build",
      });
    },
    buildStart(ctx) {
      return adapter.hooks?.buildStart?.(adapterBuildContext(ctx, resolved));
    },
    buildEnd(ctx) {
      return adapter.hooks?.buildEnd?.(adapterBuildContext(ctx, resolved));
    },
  };
}

export async function runAdapterCleanup(
  ctx: BuildContext,
  resolved: ResolvedOtokAdapter | undefined,
): Promise<void> {
  if (!resolved?.adapter.hooks?.cleanup) return;
  await resolved.adapter.hooks.cleanup(adapterBuildContext(ctx, resolved));
}

export async function runAdapterFinish(
  ctx: BuildContext,
  resolved: ResolvedOtokAdapter | undefined,
): Promise<void> {
  if (!resolved?.adapter.hooks?.finish) return;
  await resolved.adapter.hooks.finish(adapterBuildContext(ctx, resolved));
}
