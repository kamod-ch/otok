import path from "node:path";
import { parseArgv, printHelp } from "./flags.js";
import { promptScaffoldOptions } from "./prompts.js";
import { scaffoldProject } from "./scaffold.js";
import { devCommand, detectPackageManager } from "./package-manager.js";
import { isValidPackageName, resolveTargetDir } from "./validate.js";
import type { ScaffoldOptions } from "./types.js";

export async function runCli(argv: string[]): Promise<number> {
  try {
    const parsed = parseArgv(argv);
    if (parsed.help) {
      printHelp();
      return 0;
    }

    let options: ScaffoldOptions;

    const interactive = !parsed.options.yes && !parsed.options.name && process.stdin.isTTY;
    if (interactive) {
      const prompted = await promptScaffoldOptions(parsed.options);
      options = {
        ...prompted,
        targetDir: resolveTargetDir(process.cwd(), prompted.name),
      };
    } else {
      if (!parsed.options.name) {
        console.error("otok: project name is required in non-interactive mode.");
        printHelp();
        return 1;
      }
      const name = parsed.options.name;
      if (!isValidPackageName(path.basename(resolveTargetDir(process.cwd(), name)))) {
        console.error(`otok: invalid package name "${name}".`);
        return 1;
      }
      options = {
        name,
        targetDir: resolveTargetDir(process.cwd(), name),
        variant: parsed.options.variant ?? "minimal",
        typescript: parsed.options.typescript ?? true,
        kamodUi: parsed.options.kamodUi ?? false,
        auth: parsed.options.auth ?? false,
        i18n: parsed.options.i18n ?? false,
        kysely: parsed.options.kysely ?? false,
        database: parsed.options.database ?? "none",
        validation: parsed.options.validation ?? false,
        testing: parsed.options.testing ?? false,
        docker: parsed.options.docker ?? false,
        githubActions: parsed.options.githubActions ?? false,
        aiJson: parsed.options.aiJson ?? false,
        adapter: parsed.options.adapter ?? "node",
        install: parsed.options.install ?? true,
        git: parsed.options.git ?? false,
        force: parsed.options.force ?? false,
        yes: parsed.options.yes ?? false,
        dryRun: parsed.options.dryRun ?? false,
        smoke: parsed.options.smoke ?? false,
        preset: parsed.options.preset,
        layers: parsed.options.layers ?? [],
        kits: parsed.options.kits,
        kitModules: parsed.options.kitModules,
        kitOverrides: parsed.options.kitOverrides,
      };
    }

    const result = await scaffoldProject(options);
    const relativeDir = path.relative(process.cwd(), result.targetDir) || ".";
    const manager = await detectPackageManager(process.cwd());

    if (options.dryRun) {
      console.log(`Dry run: would create ${result.packageName} (${result.variant})`);
      console.log(`Presets: ${result.presetChain.join(" → ")}`);
      if (result.kitsApplied.length) {
        console.log(`Kits: ${result.kitsApplied.join(", ")}`);
      }
      return 0;
    }

    console.log(`
Created ${result.packageName} (${result.variant})

Presets applied:
  ${result.presetChain.join("\n  ")}${result.kitsApplied.length ? `\n\nKits applied:\n  ${result.kitsApplied.join("\n  ")}` : ""}

Next steps:
  cd ${relativeDir}${options.install ? "" : `\n  ${devCommand(manager).replace(" dev", " install")}`}
  ${devCommand(manager)}
`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}
