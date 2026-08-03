#!/usr/bin/env node
/**
 * Cross-framework benchmark orchestrator.
 * Runs verify + optional metrics for each project in benchmarks/projects/.
 */
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const benchRoot = dirname(fileURLToPath(import.meta.url));
const projectsDir = join(benchRoot, "projects");

const FRAMEWORKS = [
  "otok-minimal",
  "hono-minimal",
  "astro-minimal",
  "react-router-minimal",
  "next-minimal",
  "sveltekit-minimal",
];

async function runVerify(projectDir) {
  const verify = join(projectDir, "verify.mjs");
  if (!existsSync(verify)) return { ok: false, reason: "no verify.mjs" };
  return new Promise((resolve) => {
    const child = spawn("node", [verify], { cwd: projectDir, stdio: "inherit" });
    child.on("close", (code) => resolve({ ok: code === 0 }));
  });
}

async function main() {
  console.log("Cross-framework benchmark comparison\n");
  console.log("Spec: benchmarks/specs/minimal-ssr.md\n");

  const available = existsSync(projectsDir)
    ? readdirSync(projectsDir).filter((d) => FRAMEWORKS.includes(d))
    : [];

  if (available.length === 0) {
    console.log("No benchmark projects installed yet.");
    console.log("Scaffold projects under benchmarks/projects/ per specs/minimal-ssr.md");
    console.log("\nExpected frameworks:", FRAMEWORKS.join(", "));
    process.exit(0);
  }

  const results = [];
  for (const name of FRAMEWORKS) {
    const dir = join(projectsDir, name);
    if (!existsSync(dir)) {
      console.log(`⏭  ${name} — not scaffolded`);
      continue;
    }
    process.stdout.write(`▶ ${name}... `);
    const result = await runVerify(dir);
    console.log(result.ok ? "✓" : "✗");
    results.push({ name, ...result });
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}

main();
