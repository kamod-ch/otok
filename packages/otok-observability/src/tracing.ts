import type { TraceSpan, Tracer } from "./types.js";

/** Lightweight in-process tracer when OpenTelemetry is unavailable. */
export function createMemoryTracer(): Tracer & { spans: TraceSpan[] } {
  const spans: TraceSpan[] = [];

  return {
    spans,
    startSpan(name, attributes) {
      const span: TraceSpan = { name, start: performance.now(), attributes };
      spans.push(span);
      return span;
    },
    endSpan(span) {
      span.end = performance.now();
    },
  };
}

/** Bridge to OpenTelemetry when `@opentelemetry/api` is installed. */
export async function createOtelTracer(serviceName: string): Promise<Tracer | null> {
  try {
    const api = await import("@opentelemetry/api");
    const tracer = api.trace.getTracer(serviceName);
    return {
      startSpan(name, attributes) {
        const otelSpan = tracer.startSpan(name, { attributes });
        const span: TraceSpan = { name, start: performance.now(), attributes };
        (span as TraceSpan & { otelSpan: typeof otelSpan }).otelSpan = otelSpan;
        return span;
      },
      endSpan(span) {
        span.end = performance.now();
        const otelSpan = (span as TraceSpan & { otelSpan?: { end(): void } }).otelSpan;
        otelSpan?.end();
      },
    };
  } catch {
    return null;
  }
}

export async function traceAsync<T>(tracer: Tracer, name: string, fn: () => Promise<T>): Promise<T> {
  const span = tracer.startSpan(name);
  try {
    return await fn();
  } finally {
    tracer.endSpan(span);
  }
}

export function traceSync<T>(tracer: Tracer, name: string, fn: () => T): T {
  const span = tracer.startSpan(name);
  try {
    return fn();
  } finally {
    tracer.endSpan(span);
  }
}
