import type { AdapterTarget, ProjectVariant, ScaffoldOptions } from "./types.js";

const VARIANTS: ProjectVariant[] = ["minimal", "content", "saas", "dashboard", "api", "kamod", "crm"];

export interface ParsedCli {
  help: boolean;
  options: Partial<ScaffoldOptions> & { name?: string };
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true" || value === "") return true;
  if (value === "false") return false;
  throw new Error(`otok: expected boolean flag value, received "${value}".`);
}

export function parseArgv(argv: string[]): ParsedCli {
  const options: ParsedCli["options"] = {
    typescript: true,
    kamodUi: false,
    auth: false,
    i18n: false,
    kysely: false,
    database: "none",
    validation: false,
    testing: false,
    docker: false,
    githubActions: false,
    aiJson: false,
    adapter: "node",
    install: true,
    git: false,
    force: false,
    yes: false,
    dryRun: false,
    smoke: false,
    layers: [],
  };

  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true, options };
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--template":
      case "--variant": {
        const value = next === "full" ? "dashboard" : next;
        options.variant = value as ProjectVariant;
        i += 1;
        break;
      }
      case "--preset":
        options.preset = next;
        i += 1;
        break;
      case "--adapter":
        options.adapter = next as AdapterTarget;
        i += 1;
        break;
      case "--database":
        options.database = next as ScaffoldOptions["database"];
        i += 1;
        break;
      case "--layer":
        options.layers!.push(next);
        i += 1;
        break;
      case "--kit":
        options.kits ??= [];
        options.kits.push(next);
        i += 1;
        break;
      case "--typescript":
        options.typescript = parseBoolean(next, true);
        i += 1;
        break;
      case "--kamod-ui":
        options.kamodUi = parseBoolean(next, true);
        i += 1;
        break;
      case "--auth":
        options.auth = parseBoolean(next, true);
        i += 1;
        break;
      case "--i18n":
        options.i18n = parseBoolean(next, true);
        i += 1;
        break;
      case "--kysely":
        options.kysely = parseBoolean(next, true);
        i += 1;
        break;
      case "--validation":
        options.validation = parseBoolean(next, true);
        i += 1;
        break;
      case "--testing":
        options.testing = parseBoolean(next, true);
        i += 1;
        break;
      case "--docker":
        options.docker = parseBoolean(next, true);
        i += 1;
        break;
      case "--github-actions":
        options.githubActions = parseBoolean(next, true);
        i += 1;
        break;
      case "--ai-json":
        options.aiJson = parseBoolean(next, true);
        i += 1;
        break;
      case "--install":
        options.install = parseBoolean(next, true);
        i += 1;
        break;
      case "--git":
        options.git = parseBoolean(next, true);
        i += 1;
        break;
      case "--force":
        options.force = true;
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--smoke":
        options.smoke = true;
        break;
      case "--no-install":
        options.install = false;
        break;
      case "--no-git":
        options.git = false;
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`otok: unknown flag ${arg}`);
        }
        if (!options.name) options.name = arg;
        else throw new Error(`otok: unexpected argument ${arg}`);
    }
  }

  if (!options.variant) options.variant = "minimal";

  if (options.kamodUi && options.variant === "minimal") {
    options.variant = "kamod";
  }

  if (!VARIANTS.includes(options.variant)) {
    throw new Error(`otok: unknown variant "${options.variant}". Expected: ${VARIANTS.join(", ")}.`);
  }

  return { help: false, options };
}

export function printHelp(): void {
  process.stdout.write(`create-otok — scaffold a new Otok application

Usage:
  pnpm create otok@latest [app-name] [options]
  npm create otok@latest [app-name] [options]
  bun create otok@latest [app-name] [options]

Variants (--template / --variant):
  minimal, content, saas, dashboard, api, kamod, crm

Options:
  --preset <name>           Use a named preset (e.g. @kamod-ch/otok-preset-saas)
  --adapter node|cloudflare|static
  --database none|sqlite|postgres   (with --kysely)
  --typescript true|false
  --kamod-ui true|false
  --auth --i18n --kysely --validation --testing --docker --github-actions --ai-json
  --layer <name>            Additional layer (repeatable)
  --kit <name>              Additional business kit (repeatable, e.g. @kamod-ch/otok-kit-admin)
  --install true|false      Run package manager install (default: true)
  --no-install              Skip install
  --git true|false          Initialize git repository
  --force                   Scaffold into a non-empty directory
  --yes, -y                 Non-interactive defaults
  --dry-run                 Print plan without writing files
  --smoke                   Run typecheck smoke test after scaffold
  --help, -h                Show help
`);
}
