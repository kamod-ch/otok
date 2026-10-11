#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import {
  percentileNearestRank,
  assertFiniteNonNegativeNumber,
  fetchValidatedHtml,
  measureLatencySeries,
  measureThroughputRps,
} from "./request-metrics.mjs";

test("percentileNearestRank", () => {
  const samples = [1, 2, 3, 4, 5];
  assert.equal(percentileNearestRank(samples, 50), 3);
  assert.equal(percentileNearestRank(samples, 95), 5);
});

test("assertFiniteNonNegativeNumber rejects invalid values", () => {
  assert.throws(() => assertFiniteNonNegativeNumber("1", "x"));
  assert.throws(() => assertFiniteNonNegativeNumber(-1, "x"));
  assert.throws(() => assertFiniteNonNegativeNumber(NaN, "x"));
});

test("fetchValidatedHtml enforces status, type, and marker", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/bad-status") {
      res.writeHead(500);
      res.end("fail");
      return;
    }
    if (req.url === "/json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<html>Dashboard marker</html>");
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  await assert.rejects(() => fetchValidatedHtml(`${base}/bad-status`, { marker: "Dashboard" }));
  await assert.rejects(() => fetchValidatedHtml(`${base}/json`, { marker: "Dashboard" }));
  const html = await fetchValidatedHtml(`${base}/`, { marker: "Dashboard" });
  assert.match(html, /Dashboard/);
  server.close();
});

test("measureThroughputRps counts only successful responses", async () => {
  let hits = 0;
  const server = createServer((req, res) => {
    hits += 1;
    if (hits % 3 === 0) {
      res.writeHead(500);
      res.end("err");
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html>ok</html>");
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const result = await measureThroughputRps(`http://127.0.0.1:${port}/`, {
    durationMs: 500,
    concurrency: 4,
    timeoutMs: 2000,
    marker: "ok",
  });
  assert.ok(result.successes > 0);
  assert.ok(result.errors > 0);
  assert.ok(result.rps > 0);
  server.close();
});

test("measureLatencySeries collects ordered quantiles", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html>Dashboard</html>");
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const stats = await measureLatencySeries(`http://127.0.0.1:${port}/`, {
    warmup: 2,
    samples: 5,
    marker: "Dashboard",
  });
  assert.ok(stats.p95Ms >= stats.p50Ms);
  server.close();
});
