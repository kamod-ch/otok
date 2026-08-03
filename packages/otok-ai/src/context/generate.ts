import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { stripEnvValues, redactText } from "../redaction/redact.js";

export type AiContextFormat = "cursor-rules" | "agents-md" | "markdown" | "json";

export interface AiContextOptions {
  root: string;
  format?: AiContextFormat;
}

export interface AiContextPayload {
  generatedAt: string;
  otokVersion: string;
  otokAiVersion: string;
  plugins: string[];
  adapter: string | null;
  publicApis: string[];
  routeConventions: string[];
  importPaths: string[];
  projectStructure: string[];
  examples: string[];
  projectRules: string[];
}

export async function generateAiContext(options: AiContextOptions): Promise<string> {
  const payload = await collectAiContext(options.root);
  const format = options.format ?? "markdown";
  switch (format) {
    case "json":
      return JSON.stringify(payload, null, 2);
    case "cursor-rules":
      return formatCursorRules(payload);
    case "agents-md":
      return formatAgentsMd(payload);
    case "markdown":
    default:
      return formatMarkdown(payload);
  }
}

export async function collectAiContext(root: string): Promise<AiContextPayload> {
  const pkg = await readPackageJson(root);
  const configSource = await readOtokConfig(root);
  const plugins = extractPlugins(configSource);
  const adapter = extractAdapter(configSource);
  const structure = await scanStructure(join(root, "src"));
  const rules = await findProjectRules(root);

  return {
    generatedAt: new Date().toISOString(),
    otokVersion: String(pkg.dependencies?.otok ?? pkg.devDependencies?.otok ?? "unknown"),
    otokAiVersion: String(pkg.dependencies?.["@kamod-ch/otok-ai"] ?? "workspace:*"),
    plugins,
    adapter,
    publicApis: PUBLIC_APIS,
    routeConventions: ROUTE_CONVENTIONS,
    importPaths: IMPORT_PATHS,
    projectStructure: structure,
    examples: RELEVANT_EXAMPLES,
    projectRules: rules,
  };
}

const PUBLIC_APIS = [
  "otok — defineConfig, defineLoader, defineAction",
  "@kamod-ch/otok-ai — AiClient, defineAiTool, ai() plugin",
  "@kamod-ch/otok-ai/loader — defineAiAction (injects ai)",
  "@kamod-ch/otok-validation — schema-validated actions",
  "@kamod-ch/otok-auth — sessions, CSRF, requireAuth",
  "@kamod-ch/otok-kysely — PostgreSQL/SQLite via Kysely",
  "@kamod-ch/otok-workflows — long-running jobs",
];

const ROUTE_CONVENTIONS = [
  "src/app/routes/ — file-based routing",
  "_layout.tsx — shared layout",
  "_middleware.ts — route guards",
  "[param].tsx — dynamic segments",
  "Actions may return Response for SSE streaming",
];

const IMPORT_PATHS = [
  "otok",
  "otok/server",
  "otok/route",
  "@kamod-ch/otok-ai",
  "@kamod-ch/otok-ai/loader",
  "@kamod-ch/otok-ai/tools (defineAiTool)",
];

const RELEVANT_EXAMPLES = [
  "examples/saas-reference",
  "examples/kit-crm-swiss",
  "examples/reference-ai-audit",
];

async function readPackageJson(root: string) {
  try {
    return JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

async function readOtokConfig(root: string): Promise<string> {
  try {
    return await readFile(join(root, "otok.config.ts"), "utf8");
  } catch {
    return "";
  }
}

function extractPlugins(source: string): string[] {
  const matches = source.match(/@kamod-ch\/otok-[\w-]+|otok-adapter-[\w-]+/g) ?? [];
  return [...new Set(matches)].sort();
}

function extractAdapter(source: string): string | null {
  const match = source.match(/adapter:\s*(\w+)\(/);
  return match?.[1] ?? null;
}

async function scanStructure(dir: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  const out: string[] = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries.slice(0, 30)) {
      const full = join(dir, entry);
      const s = await stat(full);
      const rel = relative(process.cwd(), full);
      if (s.isDirectory()) {
        out.push(`${rel}/`);
        out.push(...(await scanStructure(full, depth + 1)));
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        out.push(rel);
      }
    }
  } catch {
    // ignore
  }
  return out.slice(0, 80);
}

async function findProjectRules(root: string): Promise<string[]> {
  const paths = [
    join(root, ".cursor", "rules"),
    join(root, "AGENTS.md"),
    join(root, ".cursorrules"),
  ];
  const rules: string[] = [];
  for (const p of paths) {
    try {
      const s = await stat(p);
      if (s.isDirectory()) {
        const files = await readdir(p);
        rules.push(...files.map((f) => `.cursor/rules/${f}`));
      } else {
        rules.push(relative(root, p));
      }
    } catch {
      // skip
    }
  }
  return rules;
}

function formatMarkdown(payload: AiContextPayload): string {
  return [
    `# Otok AI Context`,
    ``,
    `Generated: ${payload.generatedAt}`,
    ``,
    `## Versions`,
    `- otok: ${payload.otokVersion}`,
    `- @kamod-ch/otok-ai: ${payload.otokAiVersion}`,
    ``,
    `## Active Plugins`,
    ...payload.plugins.map((p) => `- ${p}`),
    ``,
    `## Adapter`,
    payload.adapter ?? "none detected",
    ``,
    `## Public APIs`,
    ...payload.publicApis.map((a) => `- ${a}`),
    ``,
    `## Route Conventions`,
    ...payload.routeConventions.map((r) => `- ${r}`),
    ``,
    `## Import Paths`,
    ...payload.importPaths.map((p) => `- \`${p}\``),
    ``,
    `## Project Structure`,
    ...payload.projectStructure.slice(0, 40).map((s) => `- ${s}`),
    ``,
    `## Examples`,
    ...payload.examples.map((e) => `- ${e}`),
    ``,
    `## Project Rules`,
    ...payload.projectRules.map((r) => `- ${r}`),
    ``,
    `> No secrets or environment values are included in this file.`,
  ].join("\n");
}

function formatAgentsMd(payload: AiContextPayload): string {
  return [
    `# AGENTS.md — Otok Project Context`,
    ``,
    `This file helps coding agents work in this Otok application.`,
    ``,
    formatMarkdown(payload),
  ].join("\n");
}

function formatCursorRules(payload: AiContextPayload): string {
  const safe = stripEnvValues(payload as unknown as Record<string, unknown>);
  return [
    `---`,
    `description: Otok AI context — auto-generated, no secrets`,
    `alwaysApply: true`,
    `---`,
    ``,
    `# Otok Framework Context`,
    ``,
    `Otok version: ${payload.otokVersion}`,
    `Plugins: ${payload.plugins.join(", ") || "none"}`,
    ``,
    `Use file-based routes in src/app/routes/. Prefer @kamod-ch/otok-ai defineAiAction for AI routes.`,
    ``,
    `Public APIs: ${payload.publicApis.slice(0, 4).join("; ")}`,
    ``,
    `Do not read .env files or commit secrets.`,
    ``,
    `<!-- sanitized payload keys: ${Object.keys(safe).join(", ")} -->`,
  ].join("\n");
}

/** Strip any accidental secret-like content from output */
export function sanitizeContextOutput(text: string): string {
  return redactText(text);
}
