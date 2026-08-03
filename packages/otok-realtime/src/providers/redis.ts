import type {
  PublishInput,
  RealtimeMessage,
  RealtimeProvider,
  RealtimeProviderCapabilities,
} from "../types.js";

export interface RedisRealtimeConfig {
  url: string;
  channelPrefix?: string;
}

export interface RedisPubSubAdapter {
  publish(channel: string, payload: string): Promise<void>;
  subscribe(channel: string, handler: (payload: string) => void): Promise<() => void>;
}

/**
 * Redis-backed provider contract.
 * Wire a Redis client (ioredis, node-redis) via `createRedisProvider(adapter)`.
 */
export function createRedisProvider(
  adapter: RedisPubSubAdapter,
  options: { channelPrefix?: string; name?: string } = {},
): RealtimeProvider {
  const prefix = options.channelPrefix ?? "otok:realtime:";
  const capabilities: RealtimeProviderCapabilities = {
    multiInstance: true,
    persistence: false,
    presence: false,
  };

  function roomChannel(channel: string, room: string): string {
    return `${prefix}${channel}:${room}`;
  }

  return {
    name: options.name ?? "redis",
    capabilities,
    async publish(input: PublishInput): Promise<RealtimeMessage> {
      const message: RealtimeMessage = {
        id: input.eventId ?? crypto.randomUUID(),
        type: input.type,
        channel: input.channel,
        room: input.room,
        data: input.data,
        timestamp: new Date().toISOString(),
      };
      await adapter.publish(roomChannel(input.channel, input.room), JSON.stringify(message));
      return message;
    },
    subscribe(channel, room, handler) {
      let unsubscribe: (() => void) | undefined;
      let active = true;
      void adapter.subscribe(roomChannel(channel, room), (payload) => {
        if (!active) return;
        try {
          handler(JSON.parse(payload) as RealtimeMessage);
        } catch {
          /* ignore malformed */
        }
      }).then((fn) => {
        unsubscribe = fn;
      });
      return () => {
        active = false;
        unsubscribe?.();
      };
    },
  };
}
