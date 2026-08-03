import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export async function generateLlmsTxt(options: { root: string }): Promise<string> {
  const pkg = await readPackageJson(options.root);
  const lines: string[] = [
    `# ${pkg.name ?? "Otok App"}`,
    "",
    "> Machine-readable framework documentation for LLM agents.",
    "",
    "## Otok Version",
    "",
    `- otok: ${pkg.dependencies?.otok ?? pkg.devDependencies?.otok ?? "unknown"}`,
    `- @kamod-ch/otok-ai: ${pkg.dependencies?.["@kamod-ch/otok-ai"] ?? "unknown"}`,
    "",
    "## Public APIs",
    "",
    "- `defineLoader` / `defineAction` — route data mutations",
    "- `@kamod-ch/otok-ai/loader` — `defineAiAction` injects `ai` client",
    "- `@kamod-ch/otok-ai` — `AiClient.stream()`, `.structured()`, `.agent()`, `.embed()`",
    "- `@kamod-ch/otok-ai/tools` — `defineAiTool()` for typed tool definitions",
    "",
    "## Route Conventions",
    "",
    "- File-based routing under `src/app/routes/`",
    "- `_middleware.ts` for route-tree guards",
    "- Actions return `Response` for streaming (SSE)",
    "",
    "## Import Paths",
    "",
    "- `otok`, `otok/server`, `otok/route`",
    "- `@kamod-ch/otok-*` plugins",
    "",
    "## Examples",
    "",
    "- `examples/saas-reference` — full SaaS reference",
    "- `examples/kit-crm-swiss` — CRM with workflows",
    "",
  ];

  const rules = await findCursorRules(options.root);
  if (rules.length > 0) {
    lines.push("## Project Rules", "");
    for (const rule of rules) lines.push(`- ${rule}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function readPackageJson(root: string): Promise<Record<string, any>> {
  try {
    const raw = await readFile(join(root, "package.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function findCursorRules(root: string): Promise<string[]> {
  const rulesDir = join(root, ".cursor", "rules");
  try {
    const files = await readdir(rulesDir);
    const out: string[] = [];
    for (const file of files) {
      if (!file.endsWith(".mdc") && !file.endsWith(".md")) continue;
      const s = await stat(join(rulesDir, file));
      if (s.isFile()) out.push(`.cursor/rules/${file}`);
    }
    return out;
  } catch {
    return [];
  }
}
