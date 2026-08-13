import { definePlugin } from "@kamod-ch/otok";
import type { Hono } from "hono";
import { createMemoryProvider } from "./providers/memory.js";
import { RealtimeHub } from "./hub.js";
import { registerRealtimeRuntime } from "./registry.js";
import { registerRealtimeRoutes } from "./routes.js";
import type { ChannelDefinition, RealtimeLimits, RealtimeProvider } from "./types.js";
import type { BearerTokenVerifier } from "./auth.js";

export type RealtimeProviderConfig =
  | { type: "memory" }
  | { type: "test" }
  | { type: "custom"; provider: RealtimeProvider };

export interface RealtimePluginOptions {
  provider?: RealtimeProviderConfig;
  channels: Record<string, ChannelDefinition>;
  basePath?: string;
  limits?: Partial<RealtimeLimits>;
  heartbeatIntervalMs?: number;
  verifyBearerToken?: BearerTokenVerifier;
  contextUserKey?: string;
}

const realtimePluginFactory = definePlugin<RealtimePluginOptions>({
  name: "@kamod-ch/otok-realtime",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("realtime() options must be an object");
      }
      const record = input as RealtimePluginOptions;
      if (!record.channels || typeof record.channels !== "object") {
        throw new Error("realtime() requires channels");
      }
      return record;
    },
  },
});

export function createRealtimeProvider(config: RealtimeProviderConfig = { type: "memory" }): RealtimeProvider {
  switch (config.type) {
    case "memory":
      return createMemoryProvider();
    case "test":
      return createMemoryProvider(undefined, "test");
    case "custom":
      return config.provider;
    default:
      return createMemoryProvider();
  }
}

export function configureRealtimeApp(app: Hono, options: RealtimePluginOptions): RealtimeHub {
  const provider = createRealtimeProvider(options.provider);
  const hub = new RealtimeHub({
    provider,
    limits: options.limits,
    heartbeatIntervalMs: options.heartbeatIntervalMs,
  });

  registerRealtimeRuntime(hub, options.channels);
  registerRealtimeRoutes(app, {
    hub,
    channels: new Map(Object.entries(options.channels)),
    basePath: options.basePath,
    verifyBearerToken: options.verifyBearerToken,
    contextUserKey: options.contextUserKey,
  });

  return hub;
}

/**
 * Otok realtime plugin — SSE and WebSocket channels with typed events.
 *
 * ```ts
 * import realtime from "@kamod-ch/otok-realtime/plugin";
 *
 * export default defineConfig({
 *   plugins: [realtime({ channels: { companies: companiesChannel } })],
 * });
 * ```
 */
export default function realtimePlugin(options: RealtimePluginOptions) {
  const plugin = realtimePluginFactory(options);

  plugin.configureApp = ({ app }) => {
    configureRealtimeApp(app, options);
  };

  return plugin;
}
