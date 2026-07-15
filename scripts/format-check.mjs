#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const ignoredDirs = new Set([
  ".git",
  ".changeset",
  "node_modules",
  "dist",
  "client",
  "plans",
  "proofshot-artifacts",
  "test-results",
  "tmp",
]);
const checkedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

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
  if (content.includes("\r\n")) problems.push(`${relative}: uses CRLF line endings`);
  if (!content.endsWith("\n")) problems.push(`${relative}: missing final newline`);
  content.split("\n").forEach((line, index) => {
    if (/[\t ]+$/.test(line)) problems.push(`${relative}:${index + 1}: trailing whitespace`);
  });
}

if (problems.length > 0) {
  console.error("Format check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Format check passed.");
