import type { ObservabilityPluginOptions } from "./types.js";
import { SANITIZE_REQUEST_PATH_FALLBACK, sanitizeRequestPath } from "@kamod-ch/otok/shared";
import { createOtelTracer } from "./tracing.js";

/**
 * Use as a safe `getUrlFull` replacement when wiring `@hono/otel` (runs before route matching).
 * Never returns the raw URL on failure.
 */
export function sanitizeOpenTelemetryRequestUrl(rawUrl: string, routePattern?: string): string {
  try {
    const sanitized = sanitizeRequestPath(rawUrl, { routePattern });
    return sanitized || SANITIZE_REQUEST_PATH_FALLBACK;
  } catch {
    return SANITIZE_REQUEST_PATH_FALLBACK;
  }
}

export async function resolveTracer(
  options: ObservabilityPluginOptions & { serviceName?: string },
): Promise<import("./types.js").Tracer> {
  if (options.tracer) return options.tracer;
  const otel = await createOtelTracer(options.serviceName ?? "otok");
  if (otel) return otel;
  const { createMemoryTracer } = await import("./tracing.js");
  return createMemoryTracer();
}

export { createOtelTracer } from "./tracing.js";
