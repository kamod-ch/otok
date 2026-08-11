#!/usr/bin/env node
/** Validates minimal SSR page per benchmarks/specs/minimal-ssr.md */
const base = process.env.BENCH_URL ?? "http://127.0.0.1:3000";
const res = await fetch(base, { headers: { accept: "text/html" } });
const html = await res.text();

if (!res.ok) throw new Error(`HTTP ${res.status}`);
if (!html.includes("<title>Benchmark</title>")) throw new Error("Missing title");
if (!html.includes("<h1>Hello, Benchmark</h1>")) throw new Error("Missing h1");

process.stdout.write("✓ otok-minimal verify passed\n");
