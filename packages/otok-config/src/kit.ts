import type { OtokPresetDefinition, PresetFileEntry } from "./preset.js";

/** Optional module within a kit — routes/files apply only when enabled. */
export interface KitModuleDefinition {
  /** Stable module id, e.g. `pipelines`, `import-export`. */
  id: string;
  description?: string;
  /** File entries contributed by this module. */
  files?: PresetFileEntry[];
  /** npm dependencies added when module is enabled. */
  packageJson?: OtokPresetDefinition["packageJson"];
  /** Permission keys introduced by this module. */
  permissions?: readonly string[];
  /** Other kits/modules that must be present. */
  requires?: readonly string[];
}

/** Traceable database migration shipped with a kit. */
export interface KitMigration {
  /** Monotonic id, e.g. `20260803120000_crm_initial`. */
  id: string;
  kit: string;
  module?: string;
  description: string;
  /** SQL or programmatic migration path relative to kit package root. */
  up: string;
}

export interface KitVersionRequirement {
  /** Package name, e.g. `otok`, `@kamod-ch/otok-audit`. */
  package: string;
  range: string;
}

/** Business kit definition — extends preset with modules, migrations, and compatibility metadata. */
export interface OtokKitDefinition extends OtokPresetDefinition {
  /** Kit packages use `kind: "kit"` for tooling discrimination. */
  kind: "kit";
  /** Semantic kit version for upgrade paths. */
  version: string;
  /** Optional modules — disabled unless listed in scaffold/app config. */
  modules?: Record<string, KitModuleDefinition>;
  /** Ordered migrations (applied in id sort order). */
  migrations?: KitMigration[];
  /** Permission keys this kit defines. */
  permissions?: readonly string[];
  /** Required package versions (`otok`, extensions, optional UI layers). */
  requires?: KitVersionRequirement[];
  /** Incompatible kit names — merge fails if both present. */
  conflicts?: readonly string[];
  /** Kits that must be composed together (soft recommendation → warning). */
  recommends?: readonly string[];
}

export interface DefinedOtokKit extends OtokKitDefinition {
  readonly __otokKit: true;
}

export function defineKit(definition: OtokKitDefinition): DefinedOtokKit {
  if (!definition.name?.trim()) {
    throw new TypeError("otok: defineKit() requires a non-empty name.");
  }
  if (!definition.version?.trim()) {
    throw new TypeError("otok: defineKit() requires a version.");
  }
  if (definition.kind !== "kit") {
    throw new TypeError('otok: defineKit() requires kind: "kit".');
  }
  return Object.freeze({
    ...definition,
    __otokKit: true as const,
  });
}

export function isDefinedKit(value: unknown): value is DefinedOtokKit {
  return Boolean(value && typeof value === "object" && (value as DefinedOtokKit).__otokKit === true);
}

export interface KitComposeOptions {
  /** Enabled optional module ids per kit name. */
  enabledModules?: Record<string, readonly string[]>;
  /** App-local overrides — win over kit file entries (eject-free customization). */
  overrides?: PresetFileEntry[];
}

export interface KitConflict {
  type: "incompatible_kits" | "duplicate_route" | "duplicate_migration" | "missing_module";
  message: string;
  kits?: string[];
  path?: string;
}

export interface KitVersionMismatch {
  package: string;
  required: string;
  actual: string;
}
