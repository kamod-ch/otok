#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assertFiniteMetric, gitInfo, lockSha256, osCpus, repoRoot, writeProfileResults } from "./common.mjs";

const cloudflareExample = join(repoRoot, "examples/deployment/cloudflare");
const bundleReport = join(cloudflareExample, "benchmark-worker-bundle.json");

export async function runWorkerBundleProfile() {
  if (!existsSync(join(cloudflareExample, "node_modules"))) {
    const inst = spawnSync("pnpm", ["install"], { cwd: cloudflareExample, stdio: "inherit" });
    if (inst.status !== 0) throw new Error("Failed to install otok-deployment-cloudflare dependencies");
  }
  const measure = spawnSync("pnpm", ["run", "bundle:measure"], {
    cwd: cloudflareExample,
    stdio: "inherit",
    env: process.env,
  });
  if (measure.status !== 0) throw new Error("bundle:measure failed");

  if (!existsSync(bundleReport)) {
    throw new Error(`Missing worker bundle report at ${bundleReport}`);
  }
  const measured = JSON.parse(readFileSync(bundleReport, "utf8"));

  const metrics = {
    edgeBundleUploadKiB: assertFiniteMetric(Math.round(measured.rawKiB * 100) / 100, "edgeBundleUploadKiB"),
    edgeBundleUploadGzipKiB: assertFiniteMetric(Math.round(measured.gzipKiB * 100) / 100, "edgeBundleUploadGzipKiB"),
    edgeBundleModuleCount: assertFiniteMetric(measured.moduleCount, "edgeBundleModuleCount"),
  };

  const { gitSha, dirty } = gitInfo();
  const report = {
    profile: "worker-bundle",
    generatedAt: new Date().toISOString(),
    gitSha,
    dirty,
    lockfileSha256: lockSha256(),
    nodeVersion: process.version,
    os: { platform: process.platform, arch: process.arch, cpus: osCpus() },
    project: "examples/deployment/cloudflare",
    origin: "wrangler-deploy-dry-run",
    methodology: {
      command: "pnpm run bundle:measure",
      note: "Upload-relevant worker modules only; static assets directory excluded from upload sum",
      notMeasured: "Cloud edge latency or geographic RTT",
    },
    artifactHash: measured.artifactHash ?? null,
    workerBundle: {
      outDir: measured.outDir,
      assetBytesSeparate: measured.assetBytesSeparate,
      modules: measured.modules?.length ?? 0,
    },
    metrics,
    scenarios: null,
    navigation: null,
  };

  const path = writeProfileResults(report);
  process.stdout.write(`Wrote ${path}\n${JSON.stringify(metrics, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkerBundleProfile().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
