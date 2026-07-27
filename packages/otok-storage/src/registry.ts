import type { StorageRuntime } from "./types.js";

let runtime: StorageRuntime | null = null;

/** @internal Test helper */
export function resetStorageRuntimeForTests(): void {
  runtime = null;
}

export function registerStorageRuntime(value: StorageRuntime): void {
  runtime = value;
}

export function getStorageRuntime(): StorageRuntime {
  if (!runtime) {
    throw new Error(
      "otok-storage: no storage runtime registered. Add storage() to otok.config.ts plugins.",
    );
  }
  return runtime;
}
