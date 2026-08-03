import type { OtokPresetDefinition, PresetConflictStrategy, PresetFileEntry, PresetPackageJsonPatch } from "./preset.js";

export interface MergePresetsOptions {
  /** When true, later presets override earlier ones for conflicting destinations. */
  preferLast?: boolean;
}

export interface MergedPresetPlan {
  name: string;
  starter?: string;
  plugins: OtokPresetDefinition["plugins"];
  config: OtokPresetDefinition["config"];
  files: PresetFileEntry[];
  envSchema: Record<string, unknown>;
  packageJson: Required<PresetPackageJsonPatch>;
  overwrite: Record<string, PresetConflictStrategy>;
  chain: string[];
}

const FILE_COLLECTIONS: (keyof Pick<OtokPresetDefinition, "routes" | "layouts" | "components" | "styles" | "middleware" | "files">)[] = [
  "routes",
  "layouts",
  "components",
  "styles",
  "middleware",
  "files",
];

function normalizeExtends(extendsValue: OtokPresetDefinition["extends"]): string[] {
  if (!extendsValue) return [];
  return Array.isArray(extendsValue) ? extendsValue : [extendsValue];
}

function mergePackageJson(
  base: Required<PresetPackageJsonPatch>,
  patch: PresetPackageJsonPatch | undefined,
): Required<PresetPackageJsonPatch> {
  if (!patch) return base;
  return {
    dependencies: { ...base.dependencies, ...patch.dependencies },
    devDependencies: { ...base.devDependencies, ...patch.devDependencies },
    scripts: { ...base.scripts, ...patch.scripts },
  };
}

function mergeConfig(
  base: OtokPresetDefinition["config"],
  next: OtokPresetDefinition["config"],
): OtokPresetDefinition["config"] {
  if (!next) return base;
  if (!base) return next;
  return {
    ...base,
    ...next,
    plugins: [...(base.plugins ?? []), ...(next.plugins ?? [])],
  };
}

function collectFiles(preset: OtokPresetDefinition): PresetFileEntry[] {
  const entries: PresetFileEntry[] = [];
  for (const key of FILE_COLLECTIONS) {
    const chunk = preset[key];
    if (chunk?.length) entries.push(...chunk);
  }
  return entries;
}

function resolveFileConflict(
  existing: PresetFileEntry,
  incoming: PresetFileEntry,
  overwrite: Record<string, PresetConflictStrategy>,
  preferLast: boolean,
): PresetFileEntry | null {
  const strategy = overwrite[incoming.to] ?? overwrite["*"] ?? (preferLast ? "replace" : "replace");
  if (strategy === "skip") return existing;
  if (strategy === "merge" && existing.from.endsWith(".json") && incoming.from.endsWith(".json")) {
    return incoming;
  }
  return preferLast ? incoming : existing;
}

/**
 * Deterministic preset merge:
 * 1. Resolve `extends` depth-first (bases first, then derived).
 * 2. Append optional layer presets in declaration order.
 * 3. Later entries win path conflicts unless `overwrite` says otherwise.
 */
export function mergePresets(
  presets: OtokPresetDefinition[],
  registry: Record<string, OtokPresetDefinition>,
  options: MergePresetsOptions = {},
): MergedPresetPlan {
  const preferLast = options.preferLast !== false;
  const chain: string[] = [];
  const visited = new Set<string>();

  function flatten(name: string, bucket: OtokPresetDefinition[]): void {
    if (visited.has(name)) return;
    visited.add(name);
    const preset = registry[name];
    if (!preset) throw new Error(`otok: unknown preset "${name}".`);
    for (const base of normalizeExtends(preset.extends)) flatten(base, bucket);
    bucket.push(preset);
    chain.push(name);
  }

  const ordered: OtokPresetDefinition[] = [];
  for (const preset of presets) {
    if (preset.name && registry[preset.name]) {
      flatten(preset.name, ordered);
    } else {
      ordered.push(preset);
      chain.push(preset.name);
    }
  }

  let starter: string | undefined;
  let plugins: OtokPresetDefinition["plugins"] = [];
  let config: OtokPresetDefinition["config"];
  let envSchema: Record<string, unknown> = {};
  let packageJson: Required<PresetPackageJsonPatch> = {
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };
  let overwrite: Record<string, PresetConflictStrategy> = {};
  const fileMap = new Map<string, PresetFileEntry>();

  for (const preset of ordered) {
    if (preset.starter) starter = preset.starter;
    plugins = [...(plugins ?? []), ...(preset.plugins ?? [])];
    config = mergeConfig(config, preset.config);
    envSchema = { ...envSchema, ...(preset.envSchema ?? {}) };
    packageJson = mergePackageJson(packageJson, preset.packageJson);
    overwrite = { ...overwrite, ...(preset.overwrite ?? {}) };

    for (const entry of collectFiles(preset)) {
      const current = fileMap.get(entry.to);
      if (!current) {
        fileMap.set(entry.to, entry);
        continue;
      }
      const resolved = resolveFileConflict(current, entry, overwrite, preferLast);
      if (resolved) fileMap.set(entry.to, resolved);
    }
  }

  return {
    name: chain[chain.length - 1] ?? "merged",
    starter,
    plugins,
    config,
    files: [...fileMap.values()].sort((a, b) => a.to.localeCompare(b.to)),
    envSchema,
    packageJson,
    overwrite,
    chain,
  };
}
