import { definePlugin } from "@kamod-ch/otok";
import { createEventBus, InProcessEventBus } from "./bus/event-bus.js";
import { registerEventsRuntime } from "./registry.js";
import type { InProcessEventBusOptions } from "./bus/event-bus.js";

export interface EventsPluginOptions extends InProcessEventBusOptions {
  /** Process outbox on app startup (requires external outbox wiring). */
  processOutboxOnStart?: boolean;
}

const eventsPluginFactory = definePlugin<EventsPluginOptions>({
  name: "@kamod-ch/otok-events",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input != null && typeof input !== "object") {
        throw new Error("events() options must be an object");
      }
      return (input ?? {}) as EventsPluginOptions;
    },
  },
});

/**
 * Otok events plugin — registers in-process event bus on app bootstrap.
 *
 * ```ts
 * import events from "@kamod-ch/otok-events/plugin";
 *
 * export default defineConfig({
 *   plugins: [events()],
 * });
 * ```
 */
export default function eventsPlugin(options: EventsPluginOptions = {}) {
  const plugin = eventsPluginFactory(options);
  let bus: InProcessEventBus | null = null;

  plugin.configureApp = async () => {
    bus = createEventBus(options);
    registerEventsRuntime(bus);
  };

  return plugin;
}
