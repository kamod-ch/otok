export { defineConfig, definePlugin, instantiatePlugin, isPluginFactory, normalizePlugins } from "./define.js";
export type { DefinePluginSetup } from "./define.js";
export { PluginContainer, resolveOtokConfig } from "./container.js";
export { OtokConfigError, pluginError } from "./errors.js";
export {
  defineSetup,
  PluginSetupValidationError,
  validateSetupChanges,
} from "./setup.js";
export type {
  PluginSetupAppendFile,
  PluginSetupChange,
  PluginSetupContext,
  PluginSetupCreateFile,
  PluginSetupHook,
  PluginSetupMkdir,
  PluginSetupResult,
  PluginSetupTsconfigTypes,
} from "./setup.js";
export { extractRuntimeConfig, mergeUserConfig, virtualModuleId } from "./merge.js";
export type {
  AppContext,
  BuildContext,
  DevServerContext,
  ConfigSchema,
  EnvSchema,
  OtokConfigEnv,
  OtokPlugin,
  OtokPluginFactory,
  OtokPluginInput,
  OtokRuntimeConfig,
  OtokUserConfig,
  PluginConfigContext,
  PluginResolvedContext,
  ResolvedOtokConfig,
  VirtualModuleFactory,
  ViteContext,
} from "./types.js";
