export {
  assertAdapterCapability,
  adapterBuildContext,
  adapterError,
  adapterToPlugin,
  defineAdapter,
  hasAdapterCapability,
  instantiateAdapter,
  isAdapterFactory,
  normalizeAdapter,
  OTOK_ADAPTER_CAPABILITIES,
  resolveAdapter,
  runAdapterCleanup,
  runAdapterFinish,
} from "./adapter.js";
export { createDualBuildVitePlugin, dualBuildScripts } from "./adapter-vite.js";
export type { DualBuildViteOptions } from "./adapter-vite.js";
export type {
  AdapterBuildContext,
  OtokAdapter,
  OtokAdapterAssetHandling,
  OtokAdapterBuildSetup,
  OtokAdapterCapability,
  OtokAdapterEnvironment,
  OtokAdapterFactory,
  OtokAdapterHooks,
  OtokAdapterInput,
  OtokAdapterMiddleware,
  OtokAdapterOutputDirs,
  OtokAdapterPrerender,
  OtokAdapterServerEntry,
  OtokAdapterSsr,
  OtokRuntime,
  ResolvedOtokAdapter,
} from "./adapter.js";
export { defineConfig, definePlugin, definePreset, defineKit, instantiatePlugin, isPluginFactory, normalizePlugins } from "./define.js";
export type { DefinePluginSetup } from "./define.js";
export { mergePresets } from "./preset-merge.js";
export type { MergePresetsOptions, MergedPresetPlan } from "./preset-merge.js";
export type {
  DefinedOtokPreset,
  OtokPresetDefinition,
  PresetConflictStrategy,
  PresetFileEntry,
  PresetPackageJsonPatch,
} from "./preset.js";
export { isDefinedPreset } from "./preset.js";
export { isDefinedKit } from "./kit.js";
export { mergeKits, checkKitVersions, detectKitConflicts, satisfiesRange } from "./kit-merge.js";
export type { MergedKitPlan } from "./kit-merge.js";
export type {
  DefinedOtokKit,
  OtokKitDefinition,
  KitModuleDefinition,
  KitMigration,
  KitVersionRequirement,
  KitComposeOptions,
  KitConflict,
  KitVersionMismatch,
} from "./kit.js";
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
  HtmlTransformContext,
  OtokConfigEnv,
  OtokPlugin,
  OtokPluginFactory,
  OtokPluginInput,
  OtokRuntimeConfig,
  OtokUserConfig,
  PluginConfigContext,
  PluginResolvedContext,
  ProgrammaticRouteDefinition,
  ResolvedOtokConfig,
  VirtualModuleFactory,
  ViteContext,
} from "./types.js";
