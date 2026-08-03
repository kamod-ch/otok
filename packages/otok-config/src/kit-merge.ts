import { mergePresets, type MergedPresetPlan } from "./preset-merge.js";
import type { OtokPresetDefinition, PresetFileEntry } from "./preset.js";
import type {
  KitComposeOptions,
  KitConflict,
  KitVersionMismatch,
  OtokKitDefinition,
} from "./kit.js";

export interface MergedKitPlan extends MergedPresetPlan {
  kits: string[];
  migrations: NonNullable<OtokKitDefinition["migrations"]>;
  permissions: string[];
  conflicts: KitConflict[];
  versionMismatches: KitVersionMismatch[];
  enabledModules: Record<string, string[]>;
}

function collectModuleFiles(
  kit: OtokKitDefinition,
  enabledModuleIds: readonly string[],
): PresetFileEntry[] {
  const files: PresetFileEntry[] = [...(kit.files ?? [])];
  if (!kit.modules) return files;

  for (const moduleId of enabledModuleIds) {
    const mod = kit.modules[moduleId];
    if (!mod) {
      throw new Error(`otok: kit "${kit.name}" has no module "${moduleId}".`);
    }
    if (mod.files?.length) files.push(...mod.files);
  }
  return files;
}

function mergeModulePackageJson(
  kit: OtokKitDefinition,
  enabledModuleIds: readonly string[],
): OtokPresetDefinition["packageJson"] {
  let patch = kit.packageJson;
  if (!kit.modules) return patch;
  for (const moduleId of enabledModuleIds) {
    const mod = kit.modules[moduleId];
    if (!mod?.packageJson) continue;
    patch = {
      dependencies: { ...patch?.dependencies, ...mod.packageJson.dependencies },
      devDependencies: { ...patch?.devDependencies, ...mod.packageJson.devDependencies },
      scripts: { ...patch?.scripts, ...mod.packageJson.scripts },
    };
  }
  return patch;
}

/** Parse simple semver ranges: exact, ^x.y.z, >=x.y.z */
export function satisfiesRange(version: string, range: string): boolean {
  const normalize = (v: string) => v.replace(/^v/, "").split("-")[0]!.split(".").map(Number);
  const ver = normalize(version);
  const matchCaret = range.match(/^\^(\d+)\.(\d+)\.(\d+)/);
  if (matchCaret) {
    const major = Number(matchCaret[1]);
    const minor = Number(matchCaret[2]);
    const patch = Number(matchCaret[3]);
    if (major === 0) {
      return compareSemver(ver, [0, minor, patch]) >= 0 && compareSemver(ver, [0, minor + 1, 0]) < 0;
    }
    return ver[0] === major && compareSemver(ver, [major, minor, patch]) >= 0;
  }
  const matchGte = range.match(/^>=\s*(\d+\.\d+\.\d+)/);
  if (matchGte) {
    return compareSemver(ver, normalize(matchGte[1]!)) >= 0;
  }
  return version === range || version.replace(/^v/, "") === range.replace(/^v/, "");
}

function compareSemver(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function checkKitVersions(
  kits: OtokKitDefinition[],
  installed: Record<string, string>,
): KitVersionMismatch[] {
  const mismatches: KitVersionMismatch[] = [];
  for (const kit of kits) {
    for (const req of kit.requires ?? []) {
      const actual = installed[req.package];
      if (!actual) continue;
      if (!satisfiesRange(actual, req.range)) {
        mismatches.push({ package: req.package, required: req.range, actual });
      }
    }
  }
  return mismatches;
}

export function detectKitConflicts(
  kits: OtokKitDefinition[],
  plan: MergedPresetPlan,
  enabledModules: Record<string, string[]>,
): KitConflict[] {
  const conflicts: KitConflict[] = [];
  const names = kits.map((k) => k.name);

  for (const kit of kits) {
    for (const other of kit.conflicts ?? []) {
      if (names.includes(other)) {
        conflicts.push({
          type: "incompatible_kits",
          message: `Kit "${kit.name}" conflicts with "${other}".`,
          kits: [kit.name, other],
        });
      }
    }
  }

  const routeOwners = new Map<string, string>();
  for (const kit of kits) {
    const moduleIds = enabledModules[kit.name] ?? [];
    const entries = collectModuleFiles(kit, moduleIds);
    for (const entry of entries ?? []) {
      if (!entry.to.startsWith("src/app/routes/")) continue;
      const owner = routeOwners.get(entry.to);
      if (owner && owner !== kit.name) {
        conflicts.push({
          type: "duplicate_route",
          message: `Route "${entry.to}" is provided by both "${owner}" and "${kit.name}".`,
          path: entry.to,
          kits: [owner, kit.name],
        });
      } else {
        routeOwners.set(entry.to, kit.name);
      }
    }
  }

  const migrationIds = new Map<string, string>();
  for (const kit of kits) {
    for (const migration of kit.migrations ?? []) {
      const owner = migrationIds.get(migration.id);
      if (owner && owner !== kit.name) {
        conflicts.push({
          type: "duplicate_migration",
          message: `Migration "${migration.id}" is defined by both "${owner}" and "${kit.name}".`,
          path: migration.id,
          kits: [owner, kit.name],
        });
      } else {
        migrationIds.set(migration.id, kit.name);
      }
    }
  }

  for (const kit of kits) {
    const moduleIds = enabledModules[kit.name] ?? [];
    for (const moduleId of moduleIds) {
      const mod = kit.modules?.[moduleId];
      for (const required of mod?.requires ?? []) {
        const [requiredKit, requiredModule] = required.includes("/")
          ? required.split("/", 2)
          : [required, undefined];
        if (requiredKit && !names.includes(requiredKit)) {
          conflicts.push({
            type: "missing_module",
            message: `Module "${kit.name}/${moduleId}" requires kit "${requiredKit}".`,
            kits: [kit.name, requiredKit],
          });
          continue;
        }
        if (requiredModule && requiredKit) {
          const enabled = enabledModules[requiredKit] ?? [];
          if (!enabled.includes(requiredModule)) {
            conflicts.push({
              type: "missing_module",
              message: `Module "${kit.name}/${moduleId}" requires "${requiredKit}/${requiredModule}".`,
              kits: [kit.name, requiredKit],
            });
          }
        }
      }
    }
  }

  void plan;
  return conflicts;
}

/**
 * Compose one or more business kits into a scaffold plan.
 * Apps override kit files via `options.overrides` without ejecting.
 */
export function mergeKits(
  kits: OtokKitDefinition[],
  registry: Record<string, OtokPresetDefinition>,
  options: KitComposeOptions = {},
  installedVersions: Record<string, string> = {},
): MergedKitPlan {
  const enabledModules: Record<string, string[]> = {};
  const expanded: OtokPresetDefinition[] = [];

  for (const kit of kits) {
    const moduleIds = options.enabledModules?.[kit.name] ?? Object.keys(kit.modules ?? {});
    enabledModules[kit.name] = [...moduleIds];

    expanded.push({
      ...kit,
      files: [
        ...(kit.routes ?? []),
        ...(kit.layouts ?? []),
        ...(kit.components ?? []),
        ...(kit.styles ?? []),
        ...(kit.middleware ?? []),
        ...(kit.files ?? []),
        ...collectModuleFiles(kit, moduleIds),
        ...(options.overrides ?? []),
      ],
      packageJson: mergeModulePackageJson(kit, moduleIds),
    });
  }

  const plan = mergePresets(expanded, registry, { preferLast: true });
  const conflicts = detectKitConflicts(kits, plan, enabledModules);
  const versionMismatches = checkKitVersions(kits, installedVersions);

  const migrations = kits
    .flatMap((k) => k.migrations ?? [])
    .sort((a, b) => a.id.localeCompare(b.id));

  const permissions = [
    ...new Set(
      kits.flatMap((k) => [
        ...(k.permissions ?? []),
        ...Object.values(k.modules ?? {}).flatMap((m) => m.permissions ?? []),
      ]),
    ),
  ];

  return {
    ...plan,
    kits: kits.map((k) => k.name),
    migrations,
    permissions,
    conflicts,
    versionMismatches,
    enabledModules,
  };
}
