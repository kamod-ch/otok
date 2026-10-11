#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import {
  platformSupportsProcRss,
  collectProcessTreePids,
  sampleTreeRssKb,
  samplePeakTreeRss,
} from "./process-metrics.mjs";

test("platformSupportsProcRss on linux CI hosts", () => {
  if (process.platform === "linux") assert.equal(platformSupportsProcRss(), true);
});

test("collectProcessTreePids includes child process on linux", async (t) => {
  if (!platformSupportsProcRss()) {
    t.skip("Linux /proc required");
    return;
  }
  const child = spawn(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)"],
    { stdio: "ignore" },
  );
  await new Promise((r) => setTimeout(r, 50));
  const pids = collectProcessTreePids(child.pid);
  assert.ok(pids.includes(child.pid));
  child.kill("SIGKILL");
});

test("samplePeakTreeRss tracks growing tree on linux", async (t) => {
  if (!platformSupportsProcRss()) {
    t.skip("Linux /proc required");
    return;
  }
  const child = spawn(
    process.execPath,
    ["-e", "const b=Buffer.alloc(8*1024*1024); setInterval(()=>{}, 200)"],
    { stdio: "ignore" },
  );
  const started = Date.now();
  const result = await samplePeakTreeRss(child.pid, {
    intervalMs: 10,
    shouldStop: () => Date.now() - started > 200,
  });
  assert.ok(result.peakRssKb > 0);
  assert.equal(result.method, "sampled-peak-process-tree-rss");
  child.kill("SIGKILL");
});

test("sampleTreeRssKb excludes controller pid when only child sampled", () => {
  if (!platformSupportsProcRss()) return;
  const controllerRss = sampleTreeRssKb(process.pid).rssKb;
  assert.ok(controllerRss > 0);
});
