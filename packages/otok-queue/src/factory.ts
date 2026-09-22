import { OtokQueueConfigError } from "./errors.js";
import type { QueueProvider, QueueProviderConfig, QueueRetryDefaults } from "./types.js";
import { resolveQueueRetry } from "./utils.js";
import { createMemoryQueueProvider, createTestQueueProvider } from "./providers/memory.js";

export function createQueueProvider(config: QueueProviderConfig, retry?: Partial<QueueRetryDefaults>): QueueProvider {
  const retryDefaults = resolveQueueRetry(retry);
  switch (config.type) {
    case "memory":
      return createMemoryQueueProvider("memory", retryDefaults);
    case "test":
      return createTestQueueProvider(retryDefaults);
    case "postgres":
      throw new OtokQueueConfigError(
        'postgres provider requires createPostgresQueueProvider(db, options) from "@kamod-ch/otok-queue/providers/postgres"',
      );
    default: {
      const unknown = config as { type?: string };
      throw new OtokQueueConfigError(`unknown queue provider "${unknown.type ?? "undefined"}"`);
    }
  }
}
