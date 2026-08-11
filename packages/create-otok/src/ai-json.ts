import fs from "node:fs";
import path from "node:path";

export interface AiJsonManifest {
  $schema: "https://ai-json.org/schema/v1.json";
  version: 1;
  project: {
    name: string;
    type: "web-app";
  };
  commands: Record<string, string>;
  context: Record<string, string>;
  permissions: {
    filesystem: "workspace";
    network: false;
  };
  quality?: {
    required: string[];
  };
}

const commandKeys = ["dev", "build", "test", "lint", "typecheck", "format"] as const;
const qualityKeys = ["lint", "typecheck", "test", "build"] as const;

export function createAiJsonManifest(targetDir: string, packageName: string): AiJsonManifest {
  const pkg = readPackageJson(targetDir);
  const scripts = isRecord(pkg.scripts) ? pkg.scripts : {};
  const commands: Record<string, string> = {};

  for (const key of commandKeys) {
    if (typeof scripts[key] === "string" && scripts[key].length > 0) {
      commands[key] = `pnpm ${key}`;
    }
  }

  const context: Record<string, string> = {
    agents: "AGENTS.md",
    architecture: "docs/architecture.md",
    docs: "docs/",
    source: "src/",
  };

  if (fs.existsSync(path.join(targetDir, "tests"))) {
    context.tests = "tests/";
  }

  const required = qualityKeys.filter((key) => commands[key] !== undefined);
  const manifest: AiJsonManifest = {
    $schema: "https://ai-json.org/schema/v1.json",
    version: 1,
    project: {
      name: packageName,
      type: "web-app",
    },
    commands,
    context,
    permissions: {
      filesystem: "workspace",
      network: false,
    },
  };

  if (required.length > 0) {
    manifest.quality = { required };
  }

  return manifest;
}

export function writeAiJsonSupport(targetDir: string, packageName: string): string[] {
  const written: string[] = [];
  const docsDir = path.join(targetDir, "docs");
  fs.mkdirSync(docsDir, { recursive: true });

  writeFileIfMissing(
    path.join(targetDir, "AGENTS.md"),
    `# Agent instructions\n\nThis is an Otok application. Use ai.json for machine-readable project metadata and this file for human-readable agent guidance.\n\nBefore finishing changes, run the quality gates listed in ai.json when practical.\n`,
    written,
    "AGENTS.md",
  );

  writeFileIfMissing(
    path.join(docsDir, "architecture.md"),
    `# Architecture\n\nThis Otok application keeps framework-specific architecture notes outside ai.json.\n\nUpdate this document as routes, data flow, deployment adapters, or integration boundaries change.\n`,
    written,
    "docs/architecture.md",
  );

  const manifest = createAiJsonManifest(targetDir, packageName);
  fs.writeFileSync(path.join(targetDir, "ai.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  written.push("ai.json");

  return written;
}

function writeFileIfMissing(filePath: string, content: string, written: string[], relativePath: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    written.push(relativePath);
  }
}

function readPackageJson(targetDir: string): Record<string, unknown> {
  const pkgPath = path.join(targetDir, "package.json");
  return JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
