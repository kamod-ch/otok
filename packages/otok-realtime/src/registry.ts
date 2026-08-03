import type { RealtimeHub } from "./hub.js";
import type { ChannelDefinition } from "./types.js";
import { RealtimeHub as HubClass } from "./hub.js";

let runtimeHub: RealtimeHub | null = null;
let runtimeChannels = new Map<string, ChannelDefinition>();

export function registerRealtimeRuntime(
  hub: RealtimeHub,
  channels: Record<string, ChannelDefinition> | Map<string, ChannelDefinition>,
): void {
  runtimeHub = hub;
  runtimeChannels = channels instanceof Map ? channels : new Map(Object.entries(channels));
}

export function getRealtimeRuntime(): { hub: RealtimeHub; channels: Map<string, ChannelDefinition> } {
  if (!runtimeHub) {
    throw new Error(
      "otok-realtime: not registered. Add realtime() to otok.config.ts plugins.",
    );
  }
  return { hub: runtimeHub, channels: runtimeChannels };
}

export function resetRealtimeRuntimeForTests(): void {
  runtimeHub = null;
  runtimeChannels = new Map();
}

export const realtime = {
  async publish<T>(
    channel: ChannelDefinition<T>,
    room: string,
    type: string,
    data: T,
  ) {
    return getRealtimeRuntime().hub.publish(channel, room, type, data);
  },
  hub(): RealtimeHub {
    return getRealtimeRuntime().hub;
  },
  createHub(options: ConstructorParameters<typeof HubClass>[0]): RealtimeHub {
    return new HubClass(options);
  },
};

export { HubClass as RealtimeHub };
