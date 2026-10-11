/**
 * HTTP sampling helpers for Otok production benchmarks (no external load tools).
 */
import { performance } from "node:perf_hooks";

export function percentileNearestRank(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.max(0, rank - 1))];
}

export function assertFiniteNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label}: expected finite non-negative number, got ${String(value)}`);
  }
  return value;
}

export async function fetchValidatedHtml(url, { timeoutMs = 10_000, marker, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const merged = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  try {
    const res = await fetch(url, { headers: { accept: "text/html" }, signal: merged });
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Expected text/html for ${url}, got ${contentType}`);
    }
    const body = await res.text();
    if (marker && !body.includes(marker)) {
      throw new Error(`Missing page marker "${marker}" in ${url}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function measureLatencySeries(url, options = {}) {
  const {
    warmup = 20,
    samples = 200,
    timeoutMs = 10_000,
    marker,
    signal,
  } = options;
  const timings = [];
  const total = warmup + samples;
  for (let i = 0; i < total; i += 1) {
    const t0 = performance.now();
    await fetchValidatedHtml(url, { timeoutMs, marker, signal });
    if (i >= warmup) timings.push(performance.now() - t0);
  }
  timings.sort((a, b) => a - b);
  const p50 = percentileNearestRank(timings, 50);
  const p95 = percentileNearestRank(timings, 95);
  if (p50 == null || p95 == null) throw new Error("No latency samples collected");
  if (p95 < p50) throw new Error("Invalid quantiles: p95 < p50");
  return { p50Ms: p50, p95Ms: p95, sampleCount: timings.length };
}

export async function measureThroughputRps(url, options = {}) {
  const {
    durationMs = 10_000,
    concurrency = 10,
    timeoutMs = 10_000,
    marker,
    signal,
  } = options;
  const started = performance.now();
  const deadline = started + durationMs;
  let successes = 0;
  let errors = 0;

  async function worker() {
    while (performance.now() < deadline) {
      if (signal?.aborted) break;
      try {
        await fetchValidatedHtml(url, { timeoutMs, marker, signal });
        successes += 1;
      } catch {
        errors += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = performance.now() - started;
  const rps = elapsedMs > 0 ? (successes / elapsedMs) * 1000 : 0;
  return { rps, successes, errors, durationMs: elapsedMs, concurrency };
}
