import * as p from "@clack/prompts";
import type { AdapterTarget, ProjectVariant, ScaffoldOptions } from "./types.js";
import { optionsToLayers } from "./registry.js";

const VARIANTS: { value: ProjectVariant; label: string }[] = [
  { value: "minimal", label: "Minimal — counter demo, no UI library" },
  { value: "content", label: "Content website — blog/marketing pages" },
  { value: "kamod", label: "Kamod — Kamod UI + Tailwind" },
  { value: "dashboard", label: "Dashboard — admin components demo" },
  { value: "saas", label: "SaaS — auth, i18n, Kysely, validation" },
  { value: "crm", label: "CRM — mutations demo with Kamod UI" },
  { value: "api", label: "API — Hono API routes, minimal UI" },
];

function isCancel<T>(value: T | symbol): value is symbol {
  return typeof value === "symbol";
}

async function confirmOr(defaultValue: boolean, message: string): Promise<boolean> {
  const value = await p.confirm({ message, initialValue: defaultValue });
  if (isCancel(value)) throw new Error("otok: scaffold cancelled.");
  return value;
}

export async function promptScaffoldOptions(
  partial: Partial<ScaffoldOptions>,
): Promise<ScaffoldOptions> {
  p.intro("create otok");

  const nameInput = partial.name ?? (await p.text({
    message: "Project name",
    placeholder: "my-otok-app",
    validate: (value) => {
      if (!value?.trim()) return "Project name is required";
    },
  }));
  if (isCancel(nameInput)) throw new Error("otok: scaffold cancelled.");
  const name = nameInput as string;

  const variantInput =
    partial.variant ??
    (await p.select({
      message: "Project variant",
      options: VARIANTS,
      initialValue: "minimal",
    }));
  if (isCancel(variantInput)) throw new Error("otok: scaffold cancelled.");
  const variant = variantInput as ProjectVariant;

  const adapterInput =
    partial.adapter ??
    (await p.select({
      message: "Deployment adapter",
      options: [
        { value: "node", label: "Node.js server" },
        { value: "cloudflare", label: "Cloudflare Workers" },
        { value: "static", label: "Static prerender" },
      ],
      initialValue: "node",
    }));
  if (isCancel(adapterInput)) throw new Error("otok: scaffold cancelled.");
  const adapter = adapterInput as AdapterTarget;

  const addTesting = partial.testing ?? (await confirmOr(false, "Add Vitest testing?"));
  const addDocker = partial.docker ?? (await confirmOr(false, "Add Docker files?"));
  const addCi = partial.githubActions ?? (await confirmOr(false, "Add GitHub Actions CI?"));
  const addAiJson = partial.aiJson ?? (await confirmOr(false, "Add ai.json for AI coding agents?"));

  let auth = partial.auth ?? false;
  let i18n = partial.i18n ?? false;
  let kysely = partial.kysely ?? false;
  let validation = partial.validation ?? false;
  let database: ScaffoldOptions["database"] = partial.database ?? "none";

  if (variant !== "saas") {
    auth = partial.auth ?? (await confirmOr(false, "Add auth (otok-auth)?"));
    i18n = partial.i18n ?? (await confirmOr(false, "Add i18n?"));
    kysely = partial.kysely ?? (await confirmOr(false, "Add Kysely database layer?"));
    if (kysely) {
      const dbInput =
        partial.database ??
        (await p.select({
          message: "Database driver",
          options: [
            { value: "sqlite", label: "SQLite (better-sqlite3)" },
            { value: "postgres", label: "PostgreSQL (pg)" },
          ],
        }));
      if (isCancel(dbInput)) throw new Error("otok: scaffold cancelled.");
      database = dbInput as ScaffoldOptions["database"];
    }
    validation = partial.validation ?? (await confirmOr(false, "Add validation (Zod)?"));
  } else {
    kysely = true;
    database = "sqlite";
    auth = true;
    i18n = true;
    validation = true;
  }

  const install = partial.install ?? (await confirmOr(true, "Install dependencies now?"));
  const git = partial.git ?? (await confirmOr(true, "Initialize git repository?"));

  const layers = optionsToLayers({
    testing: addTesting,
    docker: addDocker,
    githubActions: addCi,
    auth,
    i18n,
    kysely,
    database,
    validation,
    adapter,
    variant,
  });

  p.outro("Ready to scaffold");

  return {
    name,
    targetDir: "",
    variant,
    typescript: true,
    kamodUi: variant === "kamod" || variant === "dashboard" || variant === "crm",
    auth,
    i18n,
    kysely,
    database,
    validation,
    testing: addTesting,
    docker: addDocker,
    githubActions: addCi,
    aiJson: addAiJson,
    adapter,
    install,
    git,
    force: partial.force ?? false,
    yes: true,
    dryRun: partial.dryRun ?? false,
    smoke: partial.smoke ?? false,
    preset: partial.preset,
    layers,
  };
}
