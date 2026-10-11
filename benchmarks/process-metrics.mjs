/**
 * Sampled peak RSS for a process tree (Linux /proc). Not an exact OS high-water mark.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

export function platformSupportsProcRss() {
  return process.platform === "linux" && existsSync("/proc/self/status");
}

export function readProcessRssKb(pid) {
  const statusPath = `/proc/${pid}/status`;
  if (!existsSync(statusPath)) return 0;
  const status = readFileSync(statusPath, "utf8");
  const match = /VmRSS:\s+(\d+)/.exec(status);
  return match ? Number(match[1]) : 0;
}

export function readProcessVmHwmKb(pid) {
  const statusPath = `/proc/${pid}/status`;
  if (!existsSync(statusPath)) return 0;
  const status = readFileSync(statusPath, "utf8");
  const match = /VmHWM:\s+(\d+)/.exec(status);
  return match ? Number(match[1]) : 0;
}

export function collectProcessTreePids(rootPid) {
  const known = new Set([rootPid]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const entry of readdirSync("/proc")) {
      if (!/^\d+$/.test(entry)) continue;
      const pid = Number(entry);
      if (known.has(pid)) continue;
      try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        const ppid = Number(stat.split(" ")[3]);
        if (known.has(ppid)) {
          known.add(pid);
          expanded = true;
        }
      } catch {
        // process exited
      }
    }
  }
  return [...known];
}

export function sampleTreeRssKb(rootPid) {
  let rssSum = 0;
  let hwmSum = 0;
  for (const pid of collectProcessTreePids(rootPid)) {
    rssSum += readProcessRssKb(pid);
    hwmSum += readProcessVmHwmKb(pid);
  }
  return { rssKb: rssSum, vmHwmKb: hwmSum, pids: collectProcessTreePids(rootPid).length };
}

/**
 * Poll until `shouldStop()` returns true; returns peak sampled tree RSS (KiB).
 */
export async function samplePeakTreeRss(rootPid, { intervalMs = 10, shouldStop }) {
  let peakRssKb = 0;
  while (!shouldStop()) {
    const { rssKb } = sampleTreeRssKb(rootPid);
    peakRssKb = Math.max(peakRssKb, rssKb);
    await delay(intervalMs);
  }
  return {
    peakRssKb,
    method: "sampled-peak-process-tree-rss",
    samplingIntervalMs: intervalMs,
    note: "Sum of VmRSS across tree at sample times; brief spikes may be missed.",
  };
}
