import { randomUUID } from "node:crypto";
import type { Hono } from "hono";
import { defineMiddleware, type OtokMiddleware } from "otok/server";
import { captureError } from "./error-reporting.js";
import {
  LOGGER_CONTEXT_KEY,
  REQUEST_ID_CONTEXT_KEY,
  TIMING_CONTEXT_KEY,
  type ObservabilityRuntime,
} from "./registry.js";
import type { HandlerTiming } from "./types.js";

function resolveRequestId(c: Parameters<OtokMiddleware>[0], runtime: ObservabilityRuntime): string {
  const header = runtime.options.requestIdHeader;
  const incoming = c.req.header(header);
  if (incoming) return incoming;
  if (runtime.options.generateRequestId) return randomUUID();
  return "unknown";
}

export function createRequestIdMiddleware(runtime: ObservabilityRuntime): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    const requestId = resolveRequestId(c, runtime);
    c.set(REQUEST_ID_CONTEXT_KEY as never, requestId);
    c.set(LOGGER_CONTEXT_KEY as never, runtime.logger.child({ requestId }));
    c.set(TIMING_CONTEXT_KEY as never, {} satisfies HandlerTiming);
    c.header(runtime.options.requestIdHeader, requestId);
    await next();
  });
}

export function createRequestLoggingMiddleware(runtime: ObservabilityRuntime): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    const start = performance.now();
    const url = new URL(c.req.url);
    const logger = c.get(LOGGER_CONTEXT_KEY as never) as ReturnType<ObservabilityRuntime["logger"]["child"]> | undefined;

    try {
      await next();
    } catch (error) {
      await captureError(runtime.errorReporter, {
        error,
        requestId: c.get(REQUEST_ID_CONTEXT_KEY as never) as string | undefined,
        route: url.pathname,
        method: c.req.method,
      });
      throw error;
    } finally {
      if (runtime.options.logRequests && logger) {
        const durationMs = Math.round(performance.now() - start);
        const timing = (c.get(TIMING_CONTEXT_KEY as never) as HandlerTiming | undefined) ?? {};
        logger.info("request completed", {
          method: c.req.method,
          path: url.pathname,
          status: c.res.status,
          durationMs,
          ...timing,
        });
      }
    }
  });
}

export function configureObservabilityApp(app: Hono, runtime: ObservabilityRuntime): void {
  app.use("*", createRequestIdMiddleware(runtime));
  app.use("*", createRequestLoggingMiddleware(runtime));
}
