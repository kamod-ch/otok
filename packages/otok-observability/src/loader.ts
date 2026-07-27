import type { LoaderResult, OtokActionContext, OtokContext, OtokLoader } from "otok/server";
import { getObservabilityRuntime, TIMING_CONTEXT_KEY } from "./registry.js";
import { traceAsync } from "./tracing.js";
import type { HandlerTiming } from "./types.js";

function recordTiming(hono: OtokContext["hono"], key: keyof HandlerTiming | "pluginHooksMs", ms: number, plugin?: string) {
  const timing = (hono.get(TIMING_CONTEXT_KEY as never) as HandlerTiming | undefined) ?? {};
  if (key === "pluginHooksMs" && plugin) {
    timing.pluginHooksMs = { ...(timing.pluginHooksMs ?? {}), [plugin]: ms };
  } else if (key !== "pluginHooksMs") {
    timing[key] = ms;
  }
  hono.set(TIMING_CONTEXT_KEY as never, timing as never);
}

/** Wrap a loader with tracing and duration metrics. */
export function defineLoader<Data extends LoaderResult>(
  handler: (ctx: OtokContext) => Data | Promise<Data>,
): OtokLoader<Data> {
  return async (context) => {
    const runtime = getObservabilityRuntime();
    if (!runtime.options.traceHandlers) return handler(context);

    const start = performance.now();
    try {
      return await traceAsync(runtime.tracer, `loader:${context.route}`, async () => handler(context));
    } finally {
      recordTiming(context.hono, "loaderMs", Math.round(performance.now() - start));
    }
  };
}

/** Wrap an action with tracing and duration metrics. */
export function defineAction<Result>(
  handler: (ctx: OtokActionContext) => Result | Promise<Result>,
): (context: OtokActionContext) => Result | Promise<Result> {
  return async (context) => {
    const runtime = getObservabilityRuntime();
    if (!runtime.options.traceHandlers) return handler(context);

    const start = performance.now();
    try {
      return await traceAsync(runtime.tracer, `action:${context.route}`, async () => handler(context));
    } finally {
      recordTiming(context.hono, "actionMs", Math.round(performance.now() - start));
    }
  };
}

/** Record SSR/render duration from the Otok handler. */
export function recordRenderDuration(hono: OtokContext["hono"], ms: number): void {
  recordTiming(hono, "renderMs", ms);
}

/** Record plugin hook duration. */
export function recordPluginHookDuration(hono: OtokContext["hono"], plugin: string, ms: number): void {
  recordTiming(hono, "pluginHooksMs", ms, plugin);
}
