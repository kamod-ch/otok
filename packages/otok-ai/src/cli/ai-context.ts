import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { generateAiContext, sanitizeContextOutput, type AiContextFormat } from "../context/generate.js";

export interface AiContextCliOptions {
  root?: string;
  format?: AiContextFormat;
  output?: string;
}

export async function runAiContextCommand(options: AiContextCliOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const format = options.format ?? "markdown";
  let content = await generateAiContext({ root, format });
  content = sanitizeContextOutput(content);

  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, content, "utf8");
    process.stdout.write(`Wrote ${options.output}\n`);
    return 0;
  }

  // Default outputs by format
  const defaultPaths: Record<AiContextFormat, string> = {
    "cursor-rules": join(root, ".cursor", "rules", "otok-ai-context.mdc"),
    "agents-md": join(root, "AGENTS.md"),
    markdown: join(root, "tmp", "otok-ai-context.md"),
    json: join(root, "tmp", "otok-ai-context.json"),
  };

  const outPath = defaultPaths[format];
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, content, "utf8");
  process.stdout.write(`Wrote ${outPath}\n`);
  return 0;
}

export function parseAiContextArgv(argv: string[]): AiContextCliOptions {
  const options: AiContextCliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--format" || arg === "-f") {
      options.format = argv[++i] as AiContextFormat;
    } else if (arg === "--output" || arg === "-o") {
      options.output = argv[++i];
    } else if (arg === "--root") {
      options.root = argv[++i];
    }
  }
  return options;
}

const AI_CONTEXT_HELP = `Usage:
  otok ai-context [options]

Generate a compact, version-accurate context file for Cursor, Codex, and other coding agents.
Output never includes secrets, environment values, or private content.

Options:
  --format, -f   cursor-rules | agents-md | markdown | json (default: markdown)
  --output, -o   Write to a specific file path
  --root         Project root (default: cwd)
`;

export { AI_CONTEXT_HELP };
