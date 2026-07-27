import { OtokQueueConfigError } from "./errors.js";
import type { QueueProvider, QueueProviderConfig } from "./types.js";
import { createMemoryQueueProvider, createTestQueueProvider } from "./providers/memory.js";

export function createQueueProvider(config: QueueProviderConfig): QueueProvider {
  switch (config.type) {
    case "memory":
      return createMemoryQueueProvider("memory");
    case "test":
      return createTestQueueProvider();
    default: {
      const unknown = config as { type?: string };
      throw new OtokQueueConfigError(`unknown queue provider "${unknown.type ?? "undefined"}"`);
    }
  }
}
