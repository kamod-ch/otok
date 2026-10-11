import assert from "node:assert/strict";
import { test } from "node:test";
import { assertBenchDatabaseUrl } from "./database.mjs";

test("assertBenchDatabaseUrl rejects missing URL", () => {
  assert.throws(() => assertBenchDatabaseUrl(undefined), /required/);
});

test("assertBenchDatabaseUrl rejects non-allowlisted database names", () => {
  assert.throws(
    () => assertBenchDatabaseUrl("postgres://u:p@localhost:5432/production"),
    /allowlisted/,
  );
});

test("assertBenchDatabaseUrl accepts bench/test database names", () => {
  assert.equal(assertBenchDatabaseUrl("postgres://u:p@localhost:5432/otok_bench_test"), "otok_bench_test");
});
