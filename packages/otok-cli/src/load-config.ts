import fs from "node:fs";
import path from "node:path";

export interface OtokAppConfig {
  routesDir?: string;
}

export async function loadOtokAppConfig(root: string): Promise<OtokAppConfig> {
  const configFile = path.join(root, "otok.config.ts");
  if (!fs.existsSync(configFile)) return {};

  try {
    const source = fs.readFileSync(configFile, "utf8");
    const routesMatch = /routesDir\s*:\s*["'`]([^"'`]+)["'`]/.exec(source);
    return {
      routesDir: routesMatch?.[1],
    };
  } catch {
    return {};
  }
}
