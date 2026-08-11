import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkCompatibility, resolveExtension } from "@kamod-ch/otok-registry";
import { detectPackageManager, installCommand } from "../detect-manager.js";
import {
  patchOtokConfig,
  resolveIdentifierForConfig,
} from "../config-patcher.js";
import {
  pluginImportIdentifier,
  PluginNameError,
  resolvePluginPackageName,
  uniqueImportIdentifier,
} from "../resolve-plugin-name.js";
import { runPluginSetup } from "../setup-runner.js";
import {
  DEFAULT_CONFIG_FILENAME,
  defaultConfigTemplate,
  findOtokConfigFile,
} from "../project.js";
import { confirm, fail, findProjectRoot, ok, runCommand, warn } from "../utils.js";
import { loadProjectSnapshot, loadRegistryForProject } from "../registry-context.js";

export interface AddCommandOptions {
  cwd?: string;
  dryRun?: boolean;
  skipInstall?: boolean;
}

export interface AddCommandResult {
  packageName: string;
  configPath: string;
  installed: boolean;
  configChanged: boolean;
  alreadyInstalled: boolean;
}

const DEFAULT_PLUGIN_CALLS: Record<string, (identifier: string) => string> = {
  "@kamod-ch/otok-kamod": (identifier) => `${identifier}({
  theme: "default",
  icons: true,
  forms: true,
})`,
  "@kamod-ch/otok-flash": (identifier) =>
    `${identifier}({\n  secret: process.env.FLASH_SECRET!,\n})`,
};

function defaultPluginCall(packageName: string, identifier: string): string | undefined {
  const factory = DEFAULT_PLUGIN_CALLS[packageName];
  return factory?.(identifier);
}

function usage(): string {
  return `Usage: otok add <plugin> [options]

Add an Otok plugin to the current project.

Arguments:
  plugin              Official alias (oauth, i18n, kysely, …) or npm package name

Options:
  --dry-run           Print actions without changing files or installing packages
  --skip-install      Update otok.config.ts only; skip package manager install
  --help, -h          Show this help
`;
}

export function parseAddArgv(argv: string[]): { plugin?: string; options: AddCommandOptions; help?: boolean } {
  const options: AddCommandOptions = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      return { options, help: true };
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-install") {
      options.skipInstall = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option "${arg}".`);
    }
    positional.push(arg);
  }

  return { plugin: positional[0], options };
}

export async function addPlugin(pluginInput: string, options: AddCommandOptions = {}): Promise<AddCommandResult> {
  const root = await findProjectRoot(options.cwd ?? process.cwd());
  const packageName = resolvePluginPackageName(pluginInput);

  const registry = await loadRegistryForProject(root);
  const project = await loadProjectSnapshot(root);
  const entry = resolveExtension(registry, packageName);
  if (entry) {
    const compat = checkCompatibility(entry, {
      otokVersion: project.otokVersion,
      adapter: project.adapter,
    });
    for (const message of compat.warnings) warn(message);
    if (!compat.compatible) {
      for (const message of compat.errors) fail(message);
      if (!options.dryRun) {
        const proceed =
          !process.stdin.isTTY || (await confirm("Compatibility errors detected. Install anyway?"));
        if (!proceed) throw new Error("Aborted due to compatibility errors.");
      }
    }
  } else if (packageName.startsWith("@kamod-ch/otok-")) {
    warn(`${packageName} is not listed in the extension registry.`);
  }

  const preferredIdentifier = pluginImportIdentifier(packageName);

  let configPath = await findOtokConfigFile(root);
  let configSource: string;

  if (configPath) {
    const { readFile } = await import("node:fs/promises");
    configSource = await readFile(configPath, "utf8");
  } else {
    configPath = join(root, DEFAULT_CONFIG_FILENAME);
    configSource = defaultConfigTemplate();
  }

  const { identifier: baseIdentifier, collision } = resolveIdentifierForConfig(
    configSource,
    packageName,
    preferredIdentifier,
  );

  let identifier = baseIdentifier;
  if (collision) {
    const used = new Set<string>();
    used.add(baseIdentifier);
    identifier = uniqueImportIdentifier(`${baseIdentifier}Plugin`, used);
    warn(
      `Import name "${baseIdentifier}" is already used. Using "${identifier}" instead.`,
    );
    if (process.stdin.isTTY && !options.dryRun) {
      const proceed = await confirm(`Continue with import name "${identifier}"?`);
      if (!proceed) {
        throw new Error("Aborted.");
      }
    }
  }

  const pluginCall = defaultPluginCall(packageName, identifier);
  const patch = patchOtokConfig(configSource, { packageName, identifier, pluginCall });
  if (patch.reason === "no-define-config") {
    throw new Error(
      `Could not find defineConfig({ ... }) in ${configPath}. Add the plugin manually:\n  import ${identifier} from "${packageName}";\n  plugins: [${identifier}()]`,
    );
  }

  if (patch.reason === "already-installed") {
    ok(`${packageName} is already registered in otok.config.ts.`);
    return {
      packageName,
      configPath,
      installed: false,
      configChanged: false,
      alreadyInstalled: true,
    };
  }

  if (!options.skipInstall) {
    const manager = await detectPackageManager(root);
    const { command, args } = installCommand(manager, packageName);
    await runCommand(command, args, { cwd: root, dryRun: options.dryRun });
  } else {
    process.stdout.write(`Skipping package install for ${packageName}.\n`);
  }

  if (options.dryRun) {
    process.stdout.write(`[dry-run] write ${configPath}\n`);
    process.stdout.write(`${patch.content}\n`);
  } else {
    await writeFile(configPath, patch.content, "utf8");
  }

  ok(`Updated ${configPath}`);

  const setupApplied = await runPluginSetup({
    root,
    packageName,
    dryRun: options.dryRun ?? false,
    confirmCreate: async (filePath: string) => {
      if (!process.stdin.isTTY) return false;
      return confirm(`Create ${filePath}?`);
    },
  });

  for (const file of setupApplied) {
    ok(`Applied plugin setup: ${file}`);
  }

  return {
    packageName,
    configPath,
    installed: !options.skipInstall,
    configChanged: patch.changed,
    alreadyInstalled: false,
  };
}

export async function runAddCommand(argv: string[]): Promise<number> {
  try {
    const parsed = parseAddArgv(argv);
    if (parsed.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }

    if (!parsed.plugin) {
      fail("Missing plugin name.");
      process.stderr.write(`\n${usage()}\n`);
      return 1;
    }

    await addPlugin(parsed.plugin, parsed.options);
    return 0;
  } catch (error) {
    if (error instanceof PluginNameError) {
      fail(error.message);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    fail(message);
    return 1;
  }
}

export { usage as addUsage };
