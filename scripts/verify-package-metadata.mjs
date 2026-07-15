#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const packagesDir = path.join(repoRoot, "packages");
const packageFiles = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name, "package.json"))
  .filter((file) => fs.existsSync(file));

const requiredRepository = "git+https://github.com/kamod-ch/otok.git";
const problems = [];

for (const file of packageFiles) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  const label = path.relative(repoRoot, file);
  const requireField = (field) => {
    if (!pkg[field]) problems.push(`${label}: missing ${field}`);
  };

  requireField("name");
  requireField("version");
  requireField("description");
  requireField("license");
  requireField("repository");
  requireField("bugs");
  requireField("homepage");
  requireField("files");
  requireField("type");
  requireField("engines");

  if (pkg.private) problems.push(`${label}: publishable package must not be private`);
  if (pkg.repository?.type !== "git") problems.push(`${label}: repository.type must be git`);
  if (pkg.repository?.url !== requiredRepository) problems.push(`${label}: repository.url must be ${requiredRepository}`);
  if (!pkg.repository?.directory) problems.push(`${label}: repository.directory is required`);
  if (pkg.bugs?.url !== "https://github.com/kamod-ch/otok/issues") {
    problems.push(`${label}: bugs.url must point to the Otok issue tracker`);
  }
  if (typeof pkg.homepage !== "string" || !pkg.homepage.startsWith("https://github.com/kamod-ch/otok")) {
    problems.push(`${label}: homepage must point to the package in the Otok repository`);
  }
  if (pkg.publishConfig?.access !== "public") problems.push(`${label}: publishConfig.access must be public`);
  if (pkg.engines?.node !== ">=20") problems.push(`${label}: engines.node must be >=20`);
  if (!pkg.exports && !pkg.bin) problems.push(`${label}: package should declare exports or bin`);
}

if (problems.length > 0) {
  console.error("Package metadata check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Package metadata check passed for ${packageFiles.length} packages.`);
