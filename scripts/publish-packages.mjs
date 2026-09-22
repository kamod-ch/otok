import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = path.join(repoRoot, "packages");

function run(command, options = {}) {
  console.log(`\n[publish] $ ${command}`);
  execSync(command, {
    stdio: "inherit",
    encoding: "utf8",
    cwd: options.cwd ?? repoRoot,
  });
}

function listPublishablePackageDirs() {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .filter((name) => {
      const packagePath = path.join(packagesDir, name, "package.json");
      if (!existsSync(packagePath)) return false;
      const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
      return pkg.private !== true;
    })
    .map((name) => path.join(packagesDir, name));
}

for (const packageDir of listPublishablePackageDirs()) {
  run("pnpm publish --access public --provenance --no-git-checks", { cwd: packageDir });
}

console.log("\n[publish] All otok packages published.");
