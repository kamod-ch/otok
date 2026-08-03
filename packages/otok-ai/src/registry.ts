import type { AiRuntime } from "./types.js";

let runtime: AiRuntime | null = null;

/** @internal */
export function resetAiRuntimeForTests(): void {
  runtime = null;
}

export function registerAiRuntime(value: AiRuntime): void {
  runtime = value;
}

export function getAiRuntime(): AiRuntime {
  if (!runtime) {
    throw new Error(
      "otok-ai: no AI runtime registered. Add ai() to otok.config.ts plugins.",
    );
  }
  return runtime;
}

export function tryGetAiRuntime(): AiRuntime | null {
  return runtime;
}

export function getAiClient() {
  return getAiRuntime().client;
}
