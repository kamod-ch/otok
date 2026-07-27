import type { OtokRuntimeConfig, OtokUserConfig } from "./types.js";

const RUNTIME_KEYS = [
  "base",
  "clientEntry",
  "devClientEntry",
  "devStylesheets",
  "staticDir",
  "assetsPath",
  "assetCacheControl",
  "health",
  "theme",
  "exposeErrorDetails",
  "streaming",
] as const satisfies ReadonlyArray<keyof OtokRuntimeConfig>;

export function mergeUserConfig(base: OtokUserConfig, patch: Partial<OtokUserConfig>): OtokUserConfig {
  const next: OtokUserConfig = { ...base };

  for (const key of RUNTIME_KEYS) {
    if (key in patch && patch[key] !== undefined) {
      Object.assign(next, { [key]: patch[key] });
    }
  }

  if (patch.env) {
    next.env = { ...next.env, ...patch.env };
  }

  if (patch.devtools) {
    next.devtools = { ...next.devtools, ...patch.devtools };
  }

  return next;
}

export function extractRuntimeConfig(config: OtokUserConfig): OtokRuntimeConfig {
  const runtime: OtokRuntimeConfig = {};
  for (const key of RUNTIME_KEYS) {
    if (config[key] !== undefined) {
      Object.assign(runtime, { [key]: config[key] });
    }
  }
  return runtime;
}

export function virtualModuleId(pluginName: string, moduleId: string): string {
  return `virtual:otok-plugin/${pluginName}/${moduleId}`;
}
