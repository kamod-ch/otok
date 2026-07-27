import type { KyselyRuntime } from "./types.js";

let runtime: KyselyRuntime | null = null;

/** @internal Test helper */
export function resetKyselyRuntimeForTests(): void {
  runtime = null;
}

export function registerKyselyRuntime<DB>(value: KyselyRuntime<DB>): void {
  runtime = value as KyselyRuntime;
}

export function getKyselyRuntime<DB = unknown>(): KyselyRuntime<DB> {
  if (!runtime) {
    throw new Error(
      "otok-kysely: no database runtime registered. Add kysely() to otok.config.ts plugins.",
    );
  }
  return runtime as KyselyRuntime<DB>;
}

export function tryGetKyselyRuntime<DB = unknown>(): KyselyRuntime<DB> | null {
  return runtime as KyselyRuntime<DB> | null;
}
