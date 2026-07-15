#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const ignoredDirs = new Set([".git", "node_modules", "dist", "client", "proofshot-artifacts", "tmp"]);
const checkedExtensions = new Set([".js", ".mjs", ".ts", ".tsx"]);

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) files.push(...walk(path.join(dir, entry.name)));
      continue;
    }
    if (checkedExtensions.has(path.extname(entry.name))) files.push(path.join(dir, entry.name));
  }
  return files;
}

const problems = [];
for (const file of walk(repoRoot)) {
  const content = fs.readFileSync(file, "utf8");
  const relative = path.relative(repoRoot, file);
  if (content.includes("console.log(")) {
    if (!relative.startsWith("scripts/") && !relative.startsWith("packages/create-otok/bin/")) {
      problems.push(`${relative}: avoid console.log in package/app source`);
    }
  }
  if (/\bdebugger\s*;/.test(content)) problems.push(`${relative}: remove debugger statement`);
}

if (problems.length > 0) {
  console.error("Lint failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Lint passed.");
