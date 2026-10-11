#!/usr/bin/env node
/**
 * Deterministic checks that active release/status docs match declared manifests.
 * Historical documents are excluded — they keep point-in-time wording on purpose.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const ACTIVE_RELATIVE = [
  "README.md",
  "CONTRIBUTING.md",
  "docs/node-support.md",
  "apps/docs/content/project/roadmap.md",
];

const STATUS_REL = "docs/2.0/status.md";
const MIGRATION_REL = "docs/2.0/migration.md";

function fail(messages) {
  console.error("Release docs check failed:");
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

export function runReleaseDocsCheck(options = {}) {
  const root = options.root ?? repoRoot;
  const problems = [];

  const readAt = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const existsAt = (rel) => fs.existsSync(path.join(root, rel));

  const rootPkg = JSON.parse(readAt("package.json"));
  const corePkg = JSON.parse(readAt("packages/otok/package.json"));
  const pnpmMatch = String(rootPkg.packageManager ?? "").match(/^pnpm@([\d.]+)/);
  const pnpmVersion = pnpmMatch?.[1];
  if (!pnpmVersion) problems.push("root package.json: packageManager must declare pnpm@x.y.z");

  if (!existsAt(STATUS_REL)) problems.push(`missing ${STATUS_REL}`);
  if (!existsAt(MIGRATION_REL)) problems.push(`missing ${MIGRATION_REL}`);

  for (const rel of ACTIVE_RELATIVE) {
    if (!existsAt(rel)) {
      problems.push(`missing active doc ${rel}`);
      continue;
    }
    const text = readAt(rel);
    if (!text.includes("docs/2.0/status.md") && !text.includes("./docs/2.0/status.md")) {
      problems.push(`${rel}: must link to docs/2.0/status.md`);
    }
  }

  const readme = existsAt("README.md") ? readAt("README.md") : "";
  if (/currently pre-1\.0/i.test(readme)) {
    problems.push("README.md: replace stale pre-1.0 wording with the 2.x status link");
  }
  if (readme && !readme.includes(corePkg.version)) {
    problems.push(`README.md: should mention current repo core version ${corePkg.version} via status section`);
  }

  const contributing = existsAt("CONTRIBUTING.md") ? readAt("CONTRIBUTING.md") : "";
  if (pnpmVersion && contributing && !contributing.includes(pnpmVersion.split(".")[0])) {
    problems.push(`CONTRIBUTING.md: should reference pnpm ${pnpmVersion.split(".")[0]} (from packageManager)`);
  }
  if (pnpmVersion && contributing && !contributing.includes("packageManager")) {
    problems.push("CONTRIBUTING.md: should point readers to root package.json packageManager");
  }

  const roadmap = existsAt("apps/docs/content/project/roadmap.md")
    ? readAt("apps/docs/content/project/roadmap.md")
    : "";
  if (roadmap && /plugin system until real applications prove the need/i.test(roadmap)) {
    problems.push("roadmap.md: update deferred plugin-system note — container registry ships in otok-config");
  }

  if (problems.length > 0) {
    if (options.throwOnly) return problems;
    fail(problems);
  }

  if (!options.quiet) {
    console.log(
      `Release docs check passed (core @${corePkg.version}, pnpm ${pnpmVersion ?? "unknown"}, ${ACTIVE_RELATIVE.length} active pages).`,
    );
  }
  return [];
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry && fileURLToPath(import.meta.url) === entry) {
  runReleaseDocsCheck();
}
