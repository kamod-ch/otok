import { definePlugin } from "otok";
import { createConsoleErrorReporter } from "./error-reporting.js";
import { configureObservabilityApp } from "./middleware.js";
import { resolveLogger } from "./logger.js";
import { registerObservabilityRuntime, type ObservabilityRuntime } from "./registry.js";
import { resolveTracer } from "./otel.js";
import type { ObservabilityPluginOptions } from "./types.js";

const observabilityPluginFactory = definePlugin<ObservabilityPluginOptions>({
  name: "@kamod-ch/otok-observability",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (input != null && typeof input !== "object") {
        throw new Error("observability() options must be an object");
      }
      return (input ?? {}) as ObservabilityPluginOptions;
    },
  },
});

/**
 * Otok observability plugin — request IDs, structured logs, tracing, and error reporting.
 *
 * ```ts
 * import observability from "@kamod-ch/otok-observability";
 *
 * export default defineConfig({
 *   plugins: [observability({ serviceName: "my-app" })],
 * });
 * ```
 */
export default function observability(options: ObservabilityPluginOptions = {}) {
  const plugin = observabilityPluginFactory(options);

  plugin.configureApp = async ({ app }) => {
    const logger = resolveLogger(options);
    const tracer = await resolveTracer({ ...options, serviceName: options.serviceName ?? "otok" });
    const runtime: ObservabilityRuntime = {
      options: {
        requestIdHeader: options.requestIdHeader ?? "x-request-id",
        generateRequestId: options.generateRequestId ?? true,
        logRequests: options.logRequests ?? true,
        traceHandlers: options.traceHandlers ?? true,
        ...options,
      },
      logger,
      tracer,
      errorReporter: options.errorReporter ?? createConsoleErrorReporter(logger),
    };
    registerObservabilityRuntime(runtime);
    configureObservabilityApp(app, runtime);
  };

  return plugin;
}

export { configureObservabilityApp };
