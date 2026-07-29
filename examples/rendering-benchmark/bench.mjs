#!/usr/bin/env node
/**
 * Lightweight benchmark harness for Otok rendering modes.
 * Run against a local dev server started separately.
 *
 *   OTok_BENCH_URL=http://127.0.0.1:3000 pnpm bench
 */
const base = process.env.OTOK_BENCH_URL ?? "http://127.0.0.1:3000";

async function measure(label, path) {
  const url = `${base}${path}`;
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const started = performance.now();
    const response = await fetch(url, { headers: { accept: "text/html" } });
    await response.text();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  console.log(`${label.padEnd(24)} median ${median.toFixed(1)}ms`);
}

console.log(`Benchmark target: ${base}\n`);
await measure("SSR /", "/");
await measure("Cached /cached", "/cached");
await measure("Streaming /stream", "/stream");
await measure("Deferred /deferred-demo", "/deferred-demo");
