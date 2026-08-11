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
];

/** Workspace packages that examples may depend on — packed and rewritten to file: URLs. */
const packTargets = [
  { filter: "otok", name: "otok", prefix: "otok-" },
  { filter: "@kamod-ch/otok-vite-plugin", name: "@kamod-ch/otok-vite-plugin", prefix: "otok-vite-plugin-" },
  { filter: "@kamod-ch/otok-config", name: "@kamod-ch/otok-config", prefix: "otok-config-" },
  { filter: "@kamod-ch/otok-route-typegen", name: "@kamod-ch/otok-route-typegen", prefix: "otok-route-typegen-" },
  { filter: "otok-cli", name: "otok-cli", prefix: "otok-cli-" },
  { filter: "@kamod-ch/otok-i18n", name: "@kamod-ch/otok-i18n", prefix: "kamod-ch-otok-i18n-" },
  { filter: "@kamod-ch/otok-auth", name: "@kamod-ch/otok-auth", prefix: "kamod-ch-otok-auth-" },
  { filter: "@kamod-ch/otok-oauth", name: "@kamod-ch/otok-oauth", prefix: "kamod-ch-otok-oauth-" },
];

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit", cwd: options.cwd ?? repoRoot, env: process.env });
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

    // Ensure vite-plugin is always installable
    if (!packageJson.dependencies["@kamod-ch/otok-vite-plugin"] && !packageJson.devDependencies["@kamod-ch/otok-vite-plugin"]) {
      packageJson.devDependencies["@kamod-ch/otok-vite-plugin"] = `file:${packsByName["@kamod-ch/otok-vite-plugin"]}`;
    }

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
