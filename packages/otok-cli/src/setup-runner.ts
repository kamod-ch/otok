import { mkdir, readFile, writeFile, appendFile, access, constants } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { PluginSetupChange, PluginSetupHook } from "@kamod-ch/otok-config";
import { validateSetupChanges } from "@kamod-ch/otok-config";
import { exists } from "./detect-manager.js";
import { readJsonFile } from "./utils.js";

interface PackageJsonOtok {
  otok?: {
    setup?: string;
  };
}

export async function loadPluginSetupHook(
  root: string,
  packageName: string,
): Promise<PluginSetupHook | undefined> {
  const packageJsonPath = join(root, "node_modules", ...packageName.split("/"), "package.json");
  if (!(await exists(packageJsonPath))) return undefined;

  const pkg = await readJsonFile<PackageJsonOtok>(packageJsonPath);
  const setupExport = pkg.otok?.setup;
  if (!setupExport) return undefined;

  const modulePath = join(dirname(packageJsonPath), setupExport);
  if (!(await exists(modulePath))) {
    throw new Error(`Plugin setup entry "${setupExport}" is missing in ${packageName}.`);
  }

  const mod = (await import(pathToFileURL(modulePath).href)) as { default?: PluginSetupHook; setup?: PluginSetupHook };
  return mod.setup ?? mod.default;
}

export interface ApplySetupOptions {
  root: string;
  packageName: string;
  dryRun: boolean;
  confirmCreate?: (path: string) => Promise<boolean>;
}

export async function applySetupChanges(
  changes: PluginSetupChange[],
  options: ApplySetupOptions,
): Promise<string[]> {
  const validated = validateSetupChanges(options.root, changes);
  const applied: string[] = [];

  for (const change of validated) {
    switch (change.kind) {
      case "append-file": {
        const target = join(options.root, change.path);
        if (options.dryRun) {
          process.stdout.write(`[dry-run] append ${change.path}\n`);
          applied.push(change.path);
          break;
        }
        await appendFile(target, change.content, "utf8");
        applied.push(change.path);
        break;
      }
      case "create-file": {
        const target = join(options.root, change.path);
        if (await exists(target)) {
          throw new Error(`Refusing to overwrite existing file "${change.path}".`);
        }
        if (options.confirmCreate && !(await options.confirmCreate(change.path))) {
          break;
        }
        if (options.dryRun) {
          process.stdout.write(`[dry-run] create ${change.path}\n`);
          applied.push(change.path);
          break;
        }
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, change.content, "utf8");
        applied.push(change.path);
        break;
      }
      case "mkdir": {
        const target = join(options.root, change.path);
        if (options.dryRun) {
          process.stdout.write(`[dry-run] mkdir ${change.path}\n`);
          applied.push(change.path);
          break;
        }
        await mkdir(target, { recursive: true });
        applied.push(change.path);
        break;
      }
      case "tsconfig-types": {
        const tsconfigPath = join(options.root, "tsconfig.json");
        if (!(await exists(tsconfigPath))) break;

        const raw = await readFile(tsconfigPath, "utf8");
        const json = JSON.parse(raw) as {
          compilerOptions?: { types?: string[] };
        };
        const current = new Set(json.compilerOptions?.types ?? []);
        let changed = false;
        for (const typeName of change.types) {
          if (!current.has(typeName)) {
            current.add(typeName);
            changed = true;
          }
        }
        if (!changed) break;

        json.compilerOptions ??= {};
        json.compilerOptions.types = [...current];
        if (options.dryRun) {
          process.stdout.write(`[dry-run] update tsconfig.json types\n`);
          applied.push("tsconfig.json");
          break;
        }
        await writeFile(tsconfigPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
        applied.push("tsconfig.json");
        break;
      }
      default:
        break;
    }
  }

  return applied;
}

export async function runPluginSetup(options: ApplySetupOptions): Promise<string[]> {
  const setupHook = await loadPluginSetupHook(options.root, options.packageName);
  if (!setupHook) return [];

  const result = await setupHook({
    root: options.root,
    packageName: options.packageName,
    dryRun: options.dryRun,
  });

  if (!result.changes?.length) return [];
  return applySetupChanges(result.changes, options);
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
