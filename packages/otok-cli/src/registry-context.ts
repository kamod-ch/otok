import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createRegistryClient, type LoadedRegistry } from "@otok/registry";
import { findOtokConfigFile } from "./project.js";
import { readJsonFile } from "./utils.js";

export interface ProjectSnapshot {
  root: string;
  otokVersion?: string;
  adapter?: "node" | "cloudflare" | "static";
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  configPath?: string;
  configSource?: string;
  plugins: string[];
}

export async function loadProjectSnapshot(root: string): Promise<ProjectSnapshot> {
  const pkg = await readJsonFile<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(
    join(root, "package.json"),
  );
  const configPath = await findOtokConfigFile(root);
  let configSource: string | undefined;
  if (configPath) configSource = await readFile(configPath, "utf8");

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const plugins = configSource ? extractPluginsFromConfig(configSource) : [];

  return {
    root,
    otokVersion: deps.otok?.replace(/^[\^~>=<]*/, ""),
    adapter: detectAdapter(deps),
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
    configPath,
    configSource,
    plugins,
  };
}

export function detectAdapter(deps: Record<string, string>): "node" | "cloudflare" | "static" | undefined {
  if (deps["otok-adapter-cloudflare"]) return "cloudflare";
  if (deps["otok-adapter-static"]) return "static";
  if (deps["otok-adapter-node"]) return "node";
  return undefined;
}

export function extractPluginsFromConfig(source: string): string[] {
  const plugins: string[] = [];
  const importRe = /import\s+\w+\s+from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source))) {
    const pkg = match[1]!;
    if (pkg.startsWith("@kamod-ch/otok-") || pkg.startsWith("@otok/")) {
      plugins.push(pkg);
    }
  }
  return plugins;
}

export function extractRequiredEnvVars(source: string): string[] {
  const vars = new Set<string>();
  const re = /process\.env\.([A-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    vars.add(match[1]!);
  }
  return [...vars];
}

export async function loadRegistryForProject(root: string): Promise<LoadedRegistry> {
  const client = await createRegistryClient({ offline: process.env.OTOK_REGISTRY_OFFLINE === "1" });
  return client.load(root);
}
