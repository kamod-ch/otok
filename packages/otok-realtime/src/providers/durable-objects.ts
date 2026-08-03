import type { DurableObjectRealtimeContract, RealtimeMessage } from "../types.js";

/**
 * Cloudflare Durable Objects provider contract.
 * Implement in your Worker — otok-realtime defines the interface only.
 */
export const DEFAULT_DURABLE_OBJECT_CONTRACT: DurableObjectRealtimeContract = {
  objectName(channel, room) {
    return `realtime:${channel}:${room}`;
  },
  routePattern: "/realtime/do/:channel/:room",
  serialize(message) {
    return JSON.stringify(message);
  },
  deserialize(raw) {
    return JSON.parse(raw) as RealtimeMessage;
  },
};

export interface DurableObjectProviderOptions {
  contract?: DurableObjectRealtimeContract;
  /** Fetch binding to the Durable Object namespace (provided by Worker env). */
  namespaceId: string;
}

export interface DurableObjectProviderSpec {
  contract: DurableObjectRealtimeContract;
  namespaceId: string;
  /** Documentation for Worker integration — not executable in Node. */
  integrationNotes: string[];
}

export function defineDurableObjectProvider(
  options: DurableObjectProviderOptions,
): DurableObjectProviderSpec {
  const contract = options.contract ?? DEFAULT_DURABLE_OBJECT_CONTRACT;
  return {
    contract,
    namespaceId: options.namespaceId,
    integrationNotes: [
      "Bind a Durable Object namespace in wrangler.toml.",
      "Route SSE/WebSocket upgrades to the DO stub for the channel room shard.",
      "Store event history inside the DO for Last-Event-ID replay.",
      "Use DO alarms for heartbeat sweep and stale connection cleanup.",
      "Never pass auth tokens in query strings — validate Authorization header in the Worker.",
    ],
  };
}

export type { DurableObjectRealtimeContract };
