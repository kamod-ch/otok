#!/usr/bin/env node
/**
 * Pack @kamod-ch/otok-discussions and verify subpath imports from isolated consumers.
 */
import { mkdtempSync, rmSync, readFileSync, writeFileSync, cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packDir = mkdtempSync(join(tmpdir(), "otok-discussions-pack-"));

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: opts.cwd ?? pkgRoot,
    env: opts.env ?? process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function findPack(prefix) {
  const files = spawnSync("ls", [packDir], { encoding: "utf8" }).stdout.trim().split("\n");
  const match = files.find((f) => f.startsWith(prefix) && f.endsWith(".tgz"));
  if (!match) throw new Error(`Missing pack ${prefix}*.tgz in ${packDir}`);
  return join(packDir, match);
}

function consumerLayout(tarball, importFile, extraDeps = {}) {
  const consumerDir = mkdtempSync(join(tmpdir(), "otok-discussions-consumer-"));
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify(
      {
        name: "otok-discussions-external-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@kamod-ch/otok-discussions": `file:${tarball}`,
          ...extraDeps,
        },
        devDependencies: {
          typescript: "~6.0.2",
        },
      },
      null,
      2,
    ),
  );
  cpSync(join(pkgRoot, "fixtures", importFile), join(consumerDir, "imports.ts"));
  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["imports.ts"],
      },
      null,
      2,
    ),
  );
  return consumerDir;
}

try {
  run("pnpm", ["build"]);
  run("node", ["scripts/verify-ui-artifacts.mjs"]);
  run("pnpm", ["pack", "--pack-destination", packDir]);

  const pkgJson = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
  const prefix = pkgJson.name.replace("@", "").replace("/", "-") + "-";
  const tarball = findPack(prefix);

  const profiles = [
    { label: "core+memory", file: "pack-consumer.ts", runtime: true },
    { label: "kysely", file: "pack-consumer-kysely.ts", runtime: false },
    { label: "ui+plugin-types", file: "pack-consumer-ui.ts", runtime: false },
  ];

  for (const profile of profiles) {
    const consumerDir = consumerLayout(tarball, profile.file);
    try {
      console.log(`\n→ pack consumer profile: ${profile.label}`);
      run("pnpm", ["install"], { cwd: consumerDir });
      run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: consumerDir });
      if (profile.runtime) {
        run(
          "node",
          [
            "--input-type=module",
            "-e",
            `import { createMemoryDiscussionAdapter } from '@kamod-ch/otok-discussions/adapters/memory';
           import { createTestProviders } from '@kamod-ch/otok-discussions/testing';
           const deps = createTestProviders();
           createMemoryDiscussionAdapter({ deps });
           console.log('runtime imports ok (memory/testing, no Otok/Kysely peers)');`,
          ],
          { cwd: consumerDir },
        );
      }
    } finally {
      rmSync(consumerDir, { recursive: true, force: true });
    }
  }

  console.log("\n✓ Pack consumer checks passed for @kamod-ch/otok-discussions");
} finally {
  rmSync(packDir, { recursive: true, force: true });
}
