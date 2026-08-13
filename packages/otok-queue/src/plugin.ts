import { definePlugin } from "@kamod-ch/otok";
import type { Hono } from "hono";
import { createQueueClient, QueueClient } from "./client.js";
import { createQueueProvider } from "./factory.js";
import { OtokQueueConfigError } from "./errors.js";
import { registerQueueRuntime } from "./registry.js";
import type { JobPayloadMap, QueuePluginOptions, QueueRuntime } from "./types.js";
import { resolveQueueRetry } from "./utils.js";

let client: QueueClient<JobPayloadMap> | null = null;

/** @internal Test helper */
export function resetQueueClientForTests(): void {
  client = null;
}

export function getQueueClient<TJobs extends JobPayloadMap = JobPayloadMap>() {
  if (!client) {
    throw new Error(
      "otok-queue: no queue client registered. Add queue() to otok.config.ts plugins.",
    );
  }
  return client as QueueClient<TJobs>;
}

export async function configureQueueApp<TJobs extends JobPayloadMap = JobPayloadMap>(
  _app: Hono,
  options: QueuePluginOptions<TJobs>,
): Promise<QueueRuntime<TJobs>> {
  const provider = createQueueProvider(options.provider);
  const retry = resolveQueueRetry(options.retry);
  const cron = options.cron ?? [];

  for (const schedule of cron) {
    if (provider.registerCron) {
      await provider.registerCron(schedule);
    } else {
      throw new OtokQueueConfigError(
        `queue provider "${provider.name}" does not support cron schedules`,
      );
    }
  }

  const runtime: QueueRuntime<TJobs> = {
    provider: provider as QueueRuntime<TJobs>["provider"],
    retry,
    cron,
  };

  registerQueueRuntime(runtime);
  client = createQueueClient(runtime) as QueueClient<JobPayloadMap>;
  return runtime;
}

const queuePluginFactory = definePlugin<QueuePluginOptions>({
  name: "@kamod-ch/otok-queue",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new OtokQueueConfigError("queue() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.provider || typeof record.provider !== "object") {
        throw new OtokQueueConfigError("queue() requires provider configuration");
      }
      return input as QueuePluginOptions;
    },
  },
});

export default function queue<TJobs extends JobPayloadMap = JobPayloadMap>(
  options: QueuePluginOptions<TJobs>,
) {
  const plugin = queuePluginFactory(options as QueuePluginOptions);

  plugin.configureApp = async ({ app }) => {
    await configureQueueApp(app, options);
  };

  return plugin;
}
