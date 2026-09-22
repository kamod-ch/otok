#!/usr/bin/env node
/**
 * Local/CI release gate — runs required checks only (no publish, no version bump).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  ["check:scaffold", ["pnpm", "check:scaffold"]],
  ["lint", ["pnpm", "lint"]],
  ["format:check", ["pnpm", "format:check"]],
  ["api:check", ["pnpm", "api:check"]],
  ["test:gates", ["pnpm", "test:gates"]],
  ["typecheck", ["pnpm", "typecheck"]],
  ["test", ["pnpm", "test"]],
  ["build", ["pnpm", "build"]],
  ["api:snapshot", ["pnpm", "api:snapshot:check"]],
  ["pack:check", ["pnpm", "pack:check"]],
  ["pack:consumer", ["pnpm", "check:pack-consumer"]],
  ["reproducible", ["pnpm", "reproducible:check"]],
  ["budget:measure", ["pnpm", "budget:measure"]],
  ["bench:otok", ["pnpm", "bench:otok"]],
  ["budget:check", ["pnpm", "budget:check"]],
  ["check:examples", ["pnpm", "check:examples"]],
];

for (const [label, cmd] of steps) {
  console.log(`\n[release-check] ${label}`);
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`[release-check] FAILED at ${label}`);
    process.exit(r.status ?? 1);
  }
}

console.log("\n[release-check] All gates passed (no publish performed).");
