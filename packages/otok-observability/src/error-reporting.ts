import type { ErrorReporter } from "./types.js";

/** Console error reporter for development. Never logs request bodies or cookies. */
export function createConsoleErrorReporter(logger: {
  error(message: string, fields?: Record<string, unknown>): void;
}): ErrorReporter {
  return {
    capture(report) {
      logger.error("unhandled error", {
        requestId: report.requestId,
        route: report.route,
        method: report.method,
        error:
          report.error instanceof Error
            ? { name: report.error.name, message: report.error.message }
            : { name: "Error", message: String(report.error) },
        tags: report.tags,
      });
    },
  };
}

export async function captureError(reporter: ErrorReporter | undefined, report: Parameters<ErrorReporter["capture"]>[0]) {
  if (!reporter) return;
  await reporter.capture(report);
}
