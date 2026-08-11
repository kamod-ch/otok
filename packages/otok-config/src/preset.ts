import type { OtokPluginInput, OtokUserConfig } from "./types.js";

/** File copy instruction — paths are relative to the preset package root at apply time. */
export interface PresetFileEntry {
  /** Source path inside the preset or layer package. */
  from: string;
  /** Destination path relative to the project root. */
  to: string;
  /** Optional condition key matched against scaffold options. */
  when?: string;
}

export type PresetConflictStrategy = "replace" | "skip" | "merge";

export interface PresetPackageJsonPatch {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/** Serializable preset definition — safe to import from server and client tooling. */
export interface OtokPresetDefinition {
  /** Unique preset identifier, e.g. `@kamod-ch/otok-preset-saas`. */
  name: string;
  /** Semver compatibility range for the otok runtime this preset targets. */
  otok?: string;
  /** Extend one or more base presets (merged base → derived). */
  extends?: string | string[];
  /** Named starter key resolved by create-otok (maps to packaged starter directory). */
  starter?: string;
  plugins?: OtokPluginInput[];
  config?: Partial<OtokUserConfig>;
  routes?: PresetFileEntry[];
  layouts?: PresetFileEntry[];
  components?: PresetFileEntry[];
  styles?: PresetFileEntry[];
  middleware?: PresetFileEntry[];
  files?: PresetFileEntry[];
  envSchema?: Record<string, unknown>;
  packageJson?: PresetPackageJsonPatch;
  /** Per-destination conflict handling when multiple presets target the same path. */
  overwrite?: Record<string, PresetConflictStrategy>;
  /** Additional named layers applied after this preset when selected via CLI. */
  layers?: string[];
}

export interface DefinedOtokPreset extends OtokPresetDefinition {
  readonly __otokPreset: true;
}

export function definePreset(definition: OtokPresetDefinition): DefinedOtokPreset {
  if (!definition.name?.trim()) {
    throw new TypeError("otok: definePreset() requires a non-empty name.");
  }
  return Object.freeze({
    ...definition,
    __otokPreset: true as const,
  });
}

export function isDefinedPreset(value: unknown): value is DefinedOtokPreset {
  return Boolean(value && typeof value === "object" && (value as DefinedOtokPreset).__otokPreset === true);
}
