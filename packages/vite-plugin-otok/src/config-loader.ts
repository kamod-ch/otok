import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const CONFIG_CANDIDATES = [
  "otok.config.ts",
  "otok.config.mts",
  "otok.config.js",
  "otok.config.mjs",
  "otok.config.cjs",
] as const;

export function findOtokConfigFile(root: string, configFile?: string): string | undefined {
  if (configFile) {
    const explicit = path.resolve(root, configFile);
    return fs.existsSync(explicit) ? explicit : undefined;
  }

  for (const candidate of CONFIG_CANDIDATES) {
    const file = path.join(root, candidate);
    if (fs.existsSync(file)) return file;
  }

  return undefined;
}

export async function importOtokConfigFile(configFile: string): Promise<unknown> {
  if (!/\.[cm]?tsx?$/.test(configFile)) {
    const mod = await import(pathToFileURL(configFile).href);
    return mod.default ?? mod;
  }

  const result = await esbuild.build({
    entryPoints: [configFile],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "external",
  });

  const tempDir = fs.mkdtempSync(path.join(path.dirname(configFile), ".otok-config-"));
  const tempFile = path.join(tempDir, "config.mjs");
  fs.writeFileSync(tempFile, result.outputFiles[0]?.text ?? "");
  try {
    const mod = await import(pathToFileURL(tempFile).href);
    return mod.default ?? mod;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function generateOtokConfigModule(configFile: string | undefined, root: string): string {
  if (!configFile) {
    return `import { resolveOtokConfig } from "@kamod-ch/otok";

const env = {
  root: ${JSON.stringify(root)},
  mode: import.meta.env.PROD ? "production" : "development",
  command: "serve",
};

let resolvedPromise;

export async function loadOtokResolvedConfig() {
  if (!resolvedPromise) {
    resolvedPromise = resolveOtokConfig({}, env);
  }
  return resolvedPromise;
}
`;
  }

  const normalized = configFile.replace(/\\/g, "/");
  return `import userConfig from ${JSON.stringify(normalized)};
import { resolveOtokConfig } from "@kamod-ch/otok";

const env = {
  root: ${JSON.stringify(root)},
  mode: import.meta.env.PROD ? "production" : "development",
  command: "serve",
};

let resolvedPromise;

export async function loadOtokResolvedConfig() {
  if (!resolvedPromise) {
    const config = userConfig && typeof userConfig === "object" && "default" in userConfig
      ? userConfig.default
      : userConfig;
    resolvedPromise = resolveOtokConfig(config ?? {}, env);
  }
  return resolvedPromise;
}
`;
}
