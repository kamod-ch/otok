import { mergeKits, mergePresets, type MergedKitPlan, type MergedPresetPlan } from "@otok/config";
import fs from "node:fs";
import path from "node:path";
import { layerPresets, presetRegistry } from "./registry.js";
import {
  applyPresetFiles,
  assertNoBlockingConflicts,
  buildSourceRoots,
  createOtokRoot,
  writeKitManifest,
} from "./kit-scaffold.js";
import {
  kitsForPreset,
  loadKitDefinitions,
  modulesForPreset,
  findMonorepoPackagesDir,
} from "./kit-registry.js";
import {
  copyDirectory,
  loadVersionMatrix,
  mergeLayer,
  patchPackageJson,
  resolveLayerDir,
  resolveStarterDir,
  writeEnvExample,
} from "./scaffold-utils.js";
import type { ScaffoldOptions, ScaffoldResult } from "./types.js";
import { assertTargetDirectory, packageNameFromPath } from "./validate.js";
import { initGit, detectPackageManager, installArgs, runCommand } from "./package-manager.js";
import { variantToPreset, optionsToLayers } from "./registry.js";

function fullRegistry() {
  return { ...presetRegistry, ...layerPresets };
}

export async function resolveScaffoldPlan(options: ScaffoldOptions): Promise<{
  presetPlan: MergedPresetPlan;
  kitPlan: MergedKitPlan | null;
  combined: MergedPresetPlan & Partial<MergedKitPlan>;
  layerNames: string[];
}> {
  const presetName = options.preset ?? variantToPreset(options.variant);
  const layerNames = [...new Set([...optionsToLayers(options), ...options.layers])].sort();
  const registry = fullRegistry();

  const presets = [
    registry[presetName],
    ...layerNames.map((layer) => {
      const preset = registry[layer];
      if (!preset) throw new Error(`otok: unknown layer preset "${layer}".`);
      return preset;
    }),
  ].filter(Boolean);

  const presetPlan = mergePresets(presets, registry);
  const kitNames = kitsForPreset(presetName, options.kits ?? []);
  let kitPlan: MergedKitPlan | null = null;

  if (kitNames.length > 0) {
    const packagesDir = findMonorepoPackagesDir(createOtokRoot);
    const kits = await loadKitDefinitions(kitNames, packagesDir);
    const matrix = loadVersionMatrix();
    kitPlan = mergeKits(
      kits,
      registry,
      {
        enabledModules: modulesForPreset(presetName, options.kitModules ?? {}),
        overrides: options.kitOverrides,
      },
      { otok: matrix.otok },
    );
    assertNoBlockingConflicts(kitPlan);
  }

  const combined = {
    ...presetPlan,
    starter: kitPlan?.starter ?? presetPlan.starter,
    files: kitPlan?.files.length ? kitPlan.files : presetPlan.files,
    packageJson: {
      dependencies: {
        ...presetPlan.packageJson.dependencies,
        ...(kitPlan?.packageJson.dependencies ?? {}),
      },
      devDependencies: {
        ...presetPlan.packageJson.devDependencies,
        ...(kitPlan?.packageJson.devDependencies ?? {}),
      },
      scripts: {
        ...presetPlan.packageJson.scripts,
        ...(kitPlan?.packageJson.scripts ?? {}),
      },
    },
    chain: [...presetPlan.chain, ...(kitPlan?.kits ?? [])],
    ...(kitPlan ?? {}),
  };

  return { presetPlan, kitPlan, combined, layerNames };
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  assertTargetDirectory(options.targetDir, options.force);
  const matrix = loadVersionMatrix();
  const packageName = packageNameFromPath(options.targetDir);

  const { combined, kitPlan, layerNames } = await resolveScaffoldPlan(options);
  if (!combined.starter) {
    throw new Error(`otok: preset does not define a starter.`);
  }

  const starterDir = resolveStarterDir(combined.starter);
  const filesWritten: string[] = [];
  const sourceRoots = buildSourceRoots(layerNames);

  if (!options.dryRun) {
    fs.mkdirSync(options.targetDir, { recursive: true });
    copyDirectory(starterDir, options.targetDir);
    filesWritten.push("starter/**");

    for (const layerName of layerNames) {
      const layerKey = layerName.replace("layer:", "");
      try {
        const layerDir = resolveLayerDir(layerKey);
        filesWritten.push(...mergeLayer(layerDir, options.targetDir));
      } catch {
        // Layer may only patch package.json without files on disk.
      }
    }

    const kitFiles = applyPresetFiles(options.targetDir, combined, sourceRoots);
    filesWritten.push(...kitFiles);

    if (kitPlan) {
      writeKitManifest(options.targetDir, kitPlan);
      filesWritten.push(".otok/kit-manifest.json");
    } else if (combined.files.length > 0) {
      writeKitManifest(options.targetDir, combined);
      filesWritten.push(".otok/kit-manifest.json");
    }

    patchPackageJson(options.targetDir, {
      name: packageName,
      matrix,
      patches: combined.packageJson,
    });

    if (combined.envSchema && Object.keys(combined.envSchema).length > 0) {
      writeEnvExample(
        options.targetDir,
        Object.keys(combined.envSchema).map((key) => `${key}=`),
      );
    }
  }

  if (options.install && !options.dryRun) {
    const manager = await detectPackageManager(process.cwd());
    const { command, args } = installArgs(manager);
    const install = runCommand(command, args, options.targetDir);
    if (!install.ok) {
      throw new Error(`otok: install failed.\n${install.stderr || install.stdout}`);
    }
  }

  if (options.git && !options.dryRun) {
    initGit(options.targetDir);
  }

  if (options.smoke && !options.dryRun) {
    await smokeCheck(options.targetDir);
  }

  return {
    targetDir: options.targetDir,
    packageName,
    variant: options.variant,
    presetChain: combined.chain,
    kitsApplied: kitPlan?.kits ?? [],
    filesWritten,
  };
}

async function smokeCheck(targetDir: string): Promise<void> {
  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) throw new Error("otok smoke: missing package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
  if (pkg.scripts?.typecheck) {
    const manager = await detectPackageManager(targetDir);
    const { command, args } = installArgs(manager);
    if (!fs.existsSync(path.join(targetDir, "node_modules"))) {
      const install = runCommand(command, args, targetDir);
      if (!install.ok) throw new Error(`otok smoke: install failed.\n${install.stderr}`);
    }
    const typecheck = runCommand(manager === "npm" ? "npm" : manager, ["run", "typecheck"], targetDir);
    if (!typecheck.ok) throw new Error(`otok smoke: typecheck failed.\n${typecheck.stderr}`);
  }
}
