export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  span?: string;
  error?: { name: string; message: string };
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

export interface ErrorReport {
  error: unknown;
  requestId?: string;
  route?: string;
  method?: string;
  tags?: Record<string, string>;
}

export interface ErrorReporter {
  capture(report: ErrorReport): void | Promise<void>;
}

export interface TraceSpan {
  name: string;
  start: number;
  end?: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): TraceSpan;
  endSpan(span: TraceSpan): void;
}

export interface ObservabilityPluginOptions {
  /** Service name for OpenTelemetry. */
  serviceName?: string;
  /** Header name for request ID. Default: `x-request-id`. */
  requestIdHeader?: string;
  /** Generate request IDs when missing. Default: true. */
  generateRequestId?: boolean;
  /** Structured logger. Default: JSON console logger. */
  logger?: Logger;
  /** Error reporting provider (Sentry, etc.). */
  errorReporter?: ErrorReporter;
  /** OpenTelemetry tracer bridge. */
  tracer?: Tracer;
  /** Additional header/cookie/query keys to redact from logs. */
  redactKeys?: string[];
  /** Log successful requests. Default: true. */
  logRequests?: boolean;
  /** Trace loaders and actions via defineLoader/defineAction wrappers. Default: true. */
  traceHandlers?: boolean;
}

export interface HandlerTiming {
  loaderMs?: number;
  actionMs?: number;
  renderMs?: number;
  pluginHooksMs?: Record<string, number>;
}
