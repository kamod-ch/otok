import { definePlugin } from "otok";
import type { Hono } from "hono";
import { createStorageClient } from "./client.js";
import { createStorageProvider } from "./factory.js";
import { OtokStorageConfigError } from "./errors.js";
import { registerStorageRuntime } from "./registry.js";
import type { StoragePluginOptions, StorageRuntime } from "./types.js";

let client: ReturnType<typeof createStorageClient> | null = null;

/** @internal Test helper */
export function resetStorageClientForTests(): void {
  client = null;
}

export function getStorageClient() {
  if (!client) {
    throw new Error(
      "otok-storage: no storage client registered. Add storage() to otok.config.ts plugins.",
    );
  }
  return client;
}

export async function configureStorageApp(
  _app: Hono,
  options: StoragePluginOptions,
): Promise<StorageRuntime> {
  if (!options.buckets || Object.keys(options.buckets).length === 0) {
    throw new OtokStorageConfigError("storage() requires at least one bucket configuration");
  }

  const provider = await createStorageProvider(options.provider);
  const runtime: StorageRuntime = {
    provider,
    buckets: options.buckets,
  };

  registerStorageRuntime(runtime);
  client = createStorageClient(runtime);
  return runtime;
}

const storagePluginFactory = definePlugin<StoragePluginOptions>({
  name: "@kamod-ch/otok-storage",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new OtokStorageConfigError("storage() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.provider || typeof record.provider !== "object") {
        throw new OtokStorageConfigError("storage() requires provider configuration");
      }
      if (!record.buckets || typeof record.buckets !== "object") {
        throw new OtokStorageConfigError("storage() requires buckets configuration");
      }
      return input as StoragePluginOptions;
    },
  },
});

export default function storage(options: StoragePluginOptions) {
  const plugin = storagePluginFactory(options);

  plugin.configureApp = async ({ app }) => {
    await configureStorageApp(app, options);
  };

  return plugin;
}
