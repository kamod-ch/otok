import type { Hono } from "hono";
import { resolveOtokConfig, type OtokConfigEnv, type OtokPluginInput, type OtokUserConfig } from "@kamod-ch/otok";
import { createTestApp, type CreateTestAppOptions } from "./index.js";

export interface PluginTestAppOptions extends Omit<CreateTestAppOptions, "configure"> {
  plugins: OtokPluginInput[];
  config?: Partial<OtokUserConfig>;
  root?: string;
  env?: Partial<OtokConfigEnv>;
  configure?: (app: Hono, ctx: { applyAppPlugins: (app: Hono) => Promise<void> }) => void;
}

/** Resolve plugins and return a test app with `applyAppPlugins` already wired. */
export async function createPluginTestApp(options: PluginTestAppOptions): Promise<Hono> {
  const root = options.root ?? "/tmp/otok-plugin-test";
  const env: OtokConfigEnv = {
    root,
    mode: options.env?.mode ?? "test",
    command: options.env?.command ?? "build",
    ...options.env,
  };

  const resolved = await resolveOtokConfig({ plugins: options.plugins, ...options.config }, env);

  return createTestApp({
    ...options,
    configure: (app) => {
      options.configure?.(app, { applyAppPlugins: resolved.applyAppPlugins });
      void resolved.applyAppPlugins(app);
    },
  });
}

export async function resolvePluginTestConfig(options: Omit<PluginTestAppOptions, "routes">) {
  const root = options.root ?? "/tmp/otok-plugin-test";
  return resolveOtokConfig(
    { plugins: options.plugins, ...options.config },
    {
      root,
      mode: options.env?.mode ?? "test",
      command: options.env?.command ?? "build",
      ...options.env,
    },
  );
}
