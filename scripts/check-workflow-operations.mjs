#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

run("pnpm --filter workflow-operations typecheck");
run("pnpm --filter workflow-operations test");
run("pnpm --filter workflow-operations build");
