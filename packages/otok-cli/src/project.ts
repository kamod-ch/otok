import { access, constants } from "node:fs/promises";
import { join } from "node:path";

const CONFIG_CANDIDATES = [
  "otok.config.ts",
  "otok.config.mts",
  "otok.config.js",
  "otok.config.mjs",
  "otok.config.cjs",
] as const;

export const DEFAULT_CONFIG_FILENAME = "otok.config.ts";

export async function configFileExists(root: string, filename: string): Promise<boolean> {
  try {
    await access(join(root, filename), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findOtokConfigFile(root: string): Promise<string | undefined> {
  for (const candidate of CONFIG_CANDIDATES) {
    if (await configFileExists(root, candidate)) {
      return join(root, candidate);
    }
  }
  return undefined;
}

export function defaultConfigTemplate(): string {
  return `import { defineConfig } from "otok";

export default defineConfig({});
`;
}
