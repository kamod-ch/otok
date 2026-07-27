import type { ObservabilityPluginOptions } from "./types.js";
import { createOtelTracer } from "./tracing.js";

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
