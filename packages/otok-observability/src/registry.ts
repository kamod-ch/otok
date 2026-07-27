import type { ObservabilityPluginOptions } from "./types.js";

let runtime: ObservabilityRuntime | null = null;

export interface ObservabilityRuntime {
  options: Required<Pick<ObservabilityPluginOptions, "requestIdHeader" | "generateRequestId" | "logRequests" | "traceHandlers">> &
    ObservabilityPluginOptions;
  logger: import("./types.js").Logger;
  tracer: import("./types.js").Tracer;
  errorReporter?: import("./types.js").ErrorReporter;
}

export function registerObservabilityRuntime(runtimeValue: ObservabilityRuntime): void {
  runtime = runtimeValue;
}

export function getObservabilityRuntime(): ObservabilityRuntime {
  if (!runtime) {
    throw new Error("otok-observability: plugin not registered. Add observability() to otok.config.ts plugins.");
  }
  return runtime;
}

export function tryGetObservabilityRuntime(): ObservabilityRuntime | null {
  return runtime;
}

export function resetObservabilityRuntimeForTests(): void {
  runtime = null;
}

export const REQUEST_ID_CONTEXT_KEY = "requestId";
export const LOGGER_CONTEXT_KEY = "logger";
export const TIMING_CONTEXT_KEY = "handlerTiming";
