#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/** Examples validated in CI (pack local packages, typecheck, build). */
const examples = [
  "reference-ai-audit",
  "reference-flat-cms",
  "typed-routes",
  "i18n-trilingual",
  "auth-github",
  "with-supabase",
];

/** Workspace packages that examples may depend on — packed and rewritten to file: URLs. */
const packTargets = [
  { filter: "otok", name: "otok", prefix: "otok-" },
  { filter: "@kamod-ch/otok-vite-plugin", name: "@kamod-ch/otok-vite-plugin", prefix: "kamod-ch-otok-vite-plugin-" },
  { filter: "@kamod-ch/otok-config", name: "@kamod-ch/otok-config", prefix: "kamod-ch-otok-config-" },
  { filter: "@kamod-ch/otok-route-typegen", name: "@kamod-ch/otok-route-typegen", prefix: "kamod-ch-otok-route-typegen-" },
  { filter: "otok-cli", name: "otok-cli", prefix: "otok-cli-" },
  { filter: "@kamod-ch/otok-ai", name: "@kamod-ch/otok-ai", prefix: "kamod-ch-otok-ai-" },
  { filter: "@kamod-ch/otok-kysely", name: "@kamod-ch/otok-kysely", prefix: "kamod-ch-otok-kysely-" },
  { filter: "@kamod-ch/otok-registry", name: "@kamod-ch/otok-registry", prefix: "kamod-ch-otok-registry-" },
  { filter: "@kamod-ch/otok-i18n", name: "@kamod-ch/otok-i18n", prefix: "kamod-ch-otok-i18n-" },
  { filter: "@kamod-ch/otok-auth", name: "@kamod-ch/otok-auth", prefix: "kamod-ch-otok-auth-" },
  { filter: "@kamod-ch/otok-oauth", name: "@kamod-ch/otok-oauth", prefix: "kamod-ch-otok-oauth-" },
  { filter: "@kamod-ch/otok-supabase", name: "@kamod-ch/otok-supabase", prefix: "kamod-ch-otok-supabase-" },
];

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, {
    stdio: "inherit",
    cwd: options.cwd ?? repoRoot,
    env: { AUTH_SECRET: "check-examples-local-secret-32-bytes", ...process.env },
  });
}

function findPack(dir, prefix) {
  const match = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".tgz"))
    .sort()
    .find((name) => {
      const rest = name.slice(prefix.length);
      return /^\d/.test(rest);
    });
  if (!match) throw new Error(`Missing pack matching ${prefix}<version>.tgz in ${dir}`);
  return path.join(dir, match);
}

function copyExample(name, destRoot) {
  const source = path.join(repoRoot, "examples", name);
  const dest = path.join(destRoot, name);
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== "node_modules" && base !== "dist" && base !== ".otok";
    },
  });

  const tsconfigPath = path.join(dest, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
    if (tsconfig.extends === "../../tsconfig.base.json") {
      const baseTsconfig = JSON.parse(fs.readFileSync(path.join(repoRoot, "tsconfig.base.json"), "utf8"));
      tsconfig.compilerOptions = {
        ...(baseTsconfig.compilerOptions ?? {}),
        ...(tsconfig.compilerOptions ?? {}),
      };
      delete tsconfig.compilerOptions.paths;
      delete tsconfig.extends;
      fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
    }
  }

  return dest;
}

function rewriteWorkspaceDeps(deps, packsByName) {
  if (!deps) return deps;
  const next = { ...deps };
  for (const name of Object.keys(next)) {
    if (packsByName[name]) {
      next[name] = `file:${packsByName[name]}`;
    }
  }
  return next;
}

const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "otok-packs-"));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "otok-examples-"));

try {
  run("pnpm -r --filter './packages/*' build");

  for (const target of packTargets) {
    run(`pnpm --filter ${JSON.stringify(target.filter)} pack --pack-destination ${JSON.stringify(packDir)}`);
  }

  /** @type {Record<string, string>} */
  const packsByName = {};
  for (const target of packTargets) {
    packsByName[target.name] = findPack(packDir, target.prefix);
  }

  for (const example of examples) {
    const exampleDir = copyExample(example, workDir);
    const packageJsonPath = path.join(exampleDir, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    packageJson.dependencies = rewriteWorkspaceDeps(
      {
        ...(packageJson.dependencies ?? {}),
        otok: `file:${packsByName.otok}`,
        "@kamod-ch/otok-vite-plugin":
          packageJson.dependencies?.["@kamod-ch/otok-vite-plugin"] || packageJson.devDependencies?.["@kamod-ch/otok-vite-plugin"]
            ? undefined
            : `file:${packsByName["@kamod-ch/otok-vite-plugin"]}`,
      },
      packsByName,
    );
    // Remove undefined keys
    for (const key of Object.keys(packageJson.dependencies)) {
      if (packageJson.dependencies[key] === undefined) delete packageJson.dependencies[key];
    }

    packageJson.devDependencies = rewriteWorkspaceDeps(packageJson.devDependencies ?? {}, packsByName);
    packageJson.devDependencies["@types/node"] ??= "^24.12.2";

    // Ensure vite-plugin and its local workspace dependencies are always installable.
    if (!packageJson.dependencies["@kamod-ch/otok-vite-plugin"] && !packageJson.devDependencies["@kamod-ch/otok-vite-plugin"]) {
      packageJson.devDependencies["@kamod-ch/otok-vite-plugin"] = `file:${packsByName["@kamod-ch/otok-vite-plugin"]}`;
    }
    packageJson.dependencies["@kamod-ch/otok-config"] = `file:${packsByName["@kamod-ch/otok-config"]}`;
    packageJson.dependencies["@kamod-ch/otok-route-typegen"] = `file:${packsByName["@kamod-ch/otok-route-typegen"]}`;
    packageJson.dependencies["@kamod-ch/otok-ai"] = `file:${packsByName["@kamod-ch/otok-ai"]}`;
    packageJson.dependencies["@kamod-ch/otok-kysely"] = `file:${packsByName["@kamod-ch/otok-kysely"]}`;
    packageJson.dependencies["@kamod-ch/otok-registry"] = `file:${packsByName["@kamod-ch/otok-registry"]}`;

    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

    run("npm install --no-fund --no-audit", { cwd: exampleDir });
    run("npx tsc -p tsconfig.json --noEmit", { cwd: exampleDir });
    run("npm run build", { cwd: exampleDir });
  }

  console.log("\nAll examples typechecked and built successfully.");
} finally {
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.rmSync(workDir, { recursive: true, force: true });
}
