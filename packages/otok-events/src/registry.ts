import type { EventBus } from "./types.js";
import { createEventBus, type InProcessEventBus } from "./bus/event-bus.js";

let runtimeBus: InProcessEventBus | null = null;

export function registerEventsRuntime(bus: InProcessEventBus): void {
  runtimeBus = bus;
}

export function getEventsRuntime(): InProcessEventBus {
  if (!runtimeBus) {
    throw new Error(
      "otok-events: bus not registered. Add events() to otok.config.ts or call registerEventsRuntime().",
    );
  }
  return runtimeBus;
}

export function tryGetEventsRuntime(): InProcessEventBus | null {
  return runtimeBus;
}

export function resetEventsRuntimeForTests(): void {
  runtimeBus = null;
}

/** Typed publish helper — uses registered runtime bus. */
export const events = {
  publish<TPayload>(
    ...args: Parameters<EventBus["publish"]>
  ): ReturnType<EventBus["publish"]> {
    return getEventsRuntime().publish(...args);
  },
  subscribe<TPayload>(
    ...args: Parameters<EventBus["subscribe"]>
  ): ReturnType<EventBus["subscribe"]> {
    return getEventsRuntime().subscribe(...args);
  },
};

export { createEventBus };
