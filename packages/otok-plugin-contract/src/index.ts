import { expect, it } from "vitest";
import {
  PluginContainer,
  instantiatePlugin,
  type OtokPlugin,
  type OtokPluginFactory,
} from "@kamod-ch/otok-config";

export interface PluginContractExpectation {
  name: string;
  version?: string;
  /** Hook names that must be defined on the plugin object */
  hooks?: Array<
    | "config"
    | "configResolved"
    | "buildStart"
    | "buildEnd"
    | "configureServer"
    | "configureApp"
    | "configureVite"
    | "registerRoutes"
    | "transformHtml"
  >;
  /** Expected virtual module keys (without virtual: prefix) */
  virtualModules?: string[];
  envKeys?: string[];
}

export interface PluginContractOptions {
  plugin: OtokPlugin | OtokPluginFactory;
  expected: PluginContractExpectation;
  root?: string;
  pluginOptions?: unknown;
}

const env = {
  root: "/tmp/otok-plugin-contract",
  mode: "test" as const,
  command: "build" as const,
};

function resolvePlugin(
  plugin: OtokPlugin | OtokPluginFactory,
  options?: unknown,
): OtokPlugin {
  return instantiatePlugin(plugin as never, options);
}

/** Validates that a plugin implements the Otok plugin contract. */
export function assertPluginContract(options: PluginContractOptions): void {
  const root = options.root ?? env.root;
  const plugin = resolvePlugin(options.plugin, options.pluginOptions);

  it("declares a unique plugin name", () => {
    expect(plugin.name).toBe(options.expected.name);
    expect(plugin.name.length).toBeGreaterThan(0);
  });

  if (options.expected.version) {
    it("declares a version", () => {
      expect(plugin.version).toBe(options.expected.version);
    });
  }

  for (const hook of options.expected.hooks ?? []) {
    it(`implements hook "${hook}"`, () => {
      expect(plugin[hook]).toBeTypeOf("function");
    });
  }

  if (options.expected.virtualModules?.length) {
    it("registers expected virtual modules", async () => {
      const resolved = await new PluginContainer(
        { plugins: [options.plugin as never] },
        { ...env, root },
      ).resolve();
      for (const key of options.expected.virtualModules!) {
        expect(resolved.virtualModules.has(`virtual:otok-plugin/${plugin.name}/${key}`)).toBe(true);
      }
    });
  }

  if (options.expected.envKeys?.length) {
    it("resolves env schema keys", async () => {
      const resolved = await new PluginContainer(
        { plugins: [options.plugin as never] },
        { ...env, root },
      ).resolve();
      for (const key of options.expected.envKeys!) {
        expect(key in resolved.env).toBe(true);
      }
    });
  }

  it("resolves without throwing", async () => {
    await expect(
      new PluginContainer({ plugins: [options.plugin as never] }, { ...env, root }).resolve(),
    ).resolves.toBeDefined();
  });
}

export { env as pluginContractEnv };
