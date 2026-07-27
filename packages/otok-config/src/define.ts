import type { OtokPlugin, OtokPluginFactory, OtokPluginInput, OtokUserConfig } from "./types.js";

export function defineConfig(config: OtokUserConfig): OtokUserConfig {
  return config;
}

export interface DefinePluginSetup<TOptions> extends Omit<OtokPlugin<TOptions>, "__options"> {}

export function definePlugin<TOptions = void>(
  setup: DefinePluginSetup<TOptions>,
): OtokPluginFactory<TOptions> {
  const factory = ((options?: TOptions) => ({
    ...setup,
    __options: options as TOptions,
  })) as OtokPluginFactory<TOptions>;

  return factory;
}

export function isPluginFactory(input: OtokPluginInput): input is OtokPluginFactory {
  return typeof input === "function";
}

export function instantiatePlugin(input: OtokPluginInput, options?: unknown): OtokPlugin {
  if (isPluginFactory(input)) {
    const factory = input as (options?: unknown) => OtokPlugin;
    return factory(options);
  }
  return input;
}

export function normalizePlugins(plugins: OtokPluginInput[] | undefined): OtokPlugin[] {
  if (!plugins) return [];
  return plugins.map((plugin) => instantiatePlugin(plugin));
}
