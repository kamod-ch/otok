import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { cpus } from "node:os";

export const benchmarksDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const repoRoot = join(benchmarksDir, "..");
export const resultsDir = join(benchmarksDir, "results");

export function gitInfo(cwd = repoRoot) {
  const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
  const dirty = spawnSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
  return {
    gitSha: sha.status === 0 ? sha.stdout.trim() : process.env.BENCH_GIT_SHA ?? "unknown",
    dirty: dirty.status === 0 ? dirty.stdout.trim().length > 0 : null,
  };
}

export function lockSha256() {
  const lock = join(repoRoot, "pnpm-lock.yaml");
  if (!existsSync(lock)) return "unknown";
  return createHash("sha256").update(readFileSync(lock, "utf8")).digest("hex");
}

export function osCpus() {
  return cpus().length;
}

export function assertFiniteMetric(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label}: expected finite non-negative number, got ${String(value)}`);
  }
  return value;
}

export async function killProcessTree(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  await delay(500);
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    if (!child.killed) child.kill("SIGKILL");
  }
  await new Promise((resolve) => child.on("close", resolve));
}

/**
 * Wait until URL returns 200 HTML containing marker (deadline-based polling).
 */
export async function waitForHtmlMarker(baseUrl, { marker, deadlineMs = 60_000, path = "/" } = {}) {
  const deadline = Date.now() + deadlineMs;
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { headers: { accept: "text/html" }, redirect: "follow" });
      if (res.status === 200) {
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("text/html")) throw new Error(`Expected text/html, got ${ct}`);
        const body = await res.text();
        if (!marker || body.includes(marker)) return { url, ms: null };
      }
    } catch {
      // retry
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for HTML marker at ${url}`);
}

export function writeProfileResults(report) {
  const runId = report.runId ?? randomUUID();
  report.runId = runId;
  const stagingDir = join(resultsDir, `.staging-${runId}`);
  mkdirSync(stagingDir, { recursive: true });
  const stagingFile = join(stagingDir, "latest.json");
  writeFileSync(stagingFile, `${JSON.stringify(report, null, 2)}\n`);
  const finalLatest = join(resultsDir, "latest.json");
  if (existsSync(finalLatest)) rmSync(finalLatest);
  renameSync(stagingFile, finalLatest);
  rmSync(stagingDir, { recursive: true, force: true });
  return finalLatest;
}

export function spawnDetached(command, args, options) {
  return spawn(command, args, { ...options, detached: true, stdio: options?.stdio ?? ["ignore", "pipe", "pipe"] });
}
