import { definePreset, type OtokPresetDefinition } from "@kamod-ch/otok-config";

/** Built-in preset registry — reused by official otok-preset-* packages. */
export const presetRegistry: Record<string, OtokPresetDefinition> = {
  "@kamod-ch/otok-preset-minimal": definePreset({
    name: "@kamod-ch/otok-preset-minimal",
    starter: "minimal",
    otok: "^0.4.0",
  }),
  "@kamod-ch/otok-preset-kamod": definePreset({
    name: "@kamod-ch/otok-preset-kamod",
    starter: "kamod",
    otok: "^0.4.0",
  }),
  "@kamod-ch/otok-preset-dashboard": definePreset({
    name: "@kamod-ch/otok-preset-dashboard",
    starter: "dashboard",
    otok: "^0.4.0",
  }),
  "@kamod-ch/otok-preset-saas": definePreset({
    name: "@kamod-ch/otok-preset-saas",
    starter: "saas",
    otok: "^0.4.0",
  }),
  "@kamod-ch/otok-preset-crm": definePreset({
    name: "@kamod-ch/otok-preset-crm",
    extends: "@kamod-ch/otok-preset-minimal",
    starter: "minimal",
    otok: "^0.4.0",
    packageJson: {
      dependencies: {
        "@kamod-ch/otok-kit-crm": "workspace:*",
      },
    },
  }),
  "@kamod-ch/otok-preset-content": definePreset({
    name: "@kamod-ch/otok-preset-content",
    starter: "content",
    otok: "^0.4.0",
  }),
  "@kamod-ch/otok-preset-api": definePreset({
    name: "@kamod-ch/otok-preset-api",
    starter: "api",
    otok: "^0.4.0",
  }),
};

export const layerPresets: Record<string, OtokPresetDefinition> = {
  "layer:testing": definePreset({
    name: "layer:testing",
    packageJson: {
      devDependencies: { vitest: "^4.1.2" },
      scripts: { test: "vitest run" },
    },
    files: [{ from: "vitest.config.ts", to: "vitest.config.ts" }],
  }),
  "layer:docker": definePreset({
    name: "layer:docker",
    files: [
      { from: "Dockerfile", to: "Dockerfile" },
      { from: "docker-compose.yml", to: "docker-compose.yml" },
    ],
  }),
  "layer:github-actions": definePreset({
    name: "layer:github-actions",
    files: [{ from: "ci.yml", to: ".github/workflows/ci.yml" }],
  }),
  "layer:auth": definePreset({
    name: "layer:auth",
    packageJson: {
      dependencies: { "@kamod-ch/otok-auth": "^1.1.0" },
    },
  }),
  "layer:i18n": definePreset({
    name: "layer:i18n",
    packageJson: {
      dependencies: { "@kamod-ch/otok-i18n": "^2.0.0" },
    },
  }),
  "layer:kysely-sqlite": definePreset({
    name: "layer:kysely-sqlite",
    packageJson: {
      dependencies: {
        "@kamod-ch/otok-kysely": "^1.0.0",
        kysely: "^0.28.2",
        "better-sqlite3": "^11.10.0",
      },
    },
  }),
  "layer:kysely-postgres": definePreset({
    name: "layer:kysely-postgres",
    packageJson: {
      dependencies: {
        "@kamod-ch/otok-kysely": "^1.0.0",
        kysely: "^0.28.2",
        pg: "^8.16.0",
      },
    },
  }),
  "layer:validation": definePreset({
    name: "layer:validation",
    packageJson: {
      dependencies: { "@kamod-ch/otok-validation": "^1.0.0", zod: "^3.24.0" },
    },
  }),
  "layer:adapter-node": definePreset({
    name: "layer:adapter-node",
    packageJson: { dependencies: { "otok-adapter-node": "^1.0.0" } },
  }),
  "layer:adapter-cloudflare": definePreset({
    name: "layer:adapter-cloudflare",
    packageJson: { dependencies: { "otok-adapter-cloudflare": "^1.0.0" } },
  }),
  "layer:adapter-static": definePreset({
    name: "layer:adapter-static",
    packageJson: { dependencies: { "otok-adapter-static": "^1.0.0" } },
  }),
};

export function variantToPreset(variant: string): string {
  const map: Record<string, string> = {
    minimal: "@kamod-ch/otok-preset-minimal",
    kamod: "@kamod-ch/otok-preset-kamod",
    dashboard: "@kamod-ch/otok-preset-dashboard",
    saas: "@kamod-ch/otok-preset-saas",
    crm: "@kamod-ch/otok-preset-crm",
    content: "@kamod-ch/otok-preset-content",
    api: "@kamod-ch/otok-preset-api",
  };
  const preset = map[variant];
  if (!preset) throw new Error(`otok: unknown variant "${variant}".`);
  return preset;
}

export function optionsToLayers(options: {
  testing?: boolean;
  docker?: boolean;
  githubActions?: boolean;
  auth?: boolean;
  i18n?: boolean;
  kysely?: boolean;
  database?: string;
  validation?: boolean;
  adapter?: string;
  variant?: string;
}): string[] {
  const layers: string[] = [];
  if (options.testing) layers.push("layer:testing");
  if (options.docker) layers.push("layer:docker");
  if (options.githubActions) layers.push("layer:github-actions");
  if (options.auth && options.variant !== "saas") layers.push("layer:auth");
  if (options.i18n && options.variant !== "saas") layers.push("layer:i18n");
  if (options.kysely && options.variant !== "saas") {
    layers.push(options.database === "postgres" ? "layer:kysely-postgres" : "layer:kysely-sqlite");
  }
  if (options.validation && options.variant !== "saas") layers.push("layer:validation");
  if (options.adapter === "cloudflare") layers.push("layer:adapter-cloudflare");
  else if (options.adapter === "static") layers.push("layer:adapter-static");
  else if (options.adapter === "node") layers.push("layer:adapter-node");
  return layers.sort();
}
