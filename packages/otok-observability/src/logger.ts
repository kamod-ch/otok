import { createRedactor } from "./redaction.js";
import type { LogLevel, LogRecord, Logger, ObservabilityPluginOptions } from "./types.js";

function formatRecord(record: LogRecord): string {
  return JSON.stringify(record);
}

export function createJsonLogger(options: { redactKeys?: string[]; base?: Record<string, unknown> } = {}): Logger {
  const redactor = createRedactor(options.redactKeys);

  const write = (level: LogLevel, message: string, fields: Record<string, unknown> = {}) => {
    const record: LogRecord = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...options.base,
      ...redactor.redactObject(fields),
    };
    const line = formatRecord(record);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  const logger: Logger = {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
    child(fields) {
      return createJsonLogger({ redactKeys: options.redactKeys, base: { ...options.base, ...fields } });
    },
  };

  return logger;
}

export function resolveLogger(options: ObservabilityPluginOptions): Logger {
  return options.logger ?? createJsonLogger({ redactKeys: options.redactKeys });
}
