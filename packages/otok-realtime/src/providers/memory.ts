import type {
  PresenceState,
  PublishInput,
  RealtimeMessage,
  RealtimeProvider,
  RealtimeProviderCapabilities,
} from "../types.js";

type RoomHandler = (message: RealtimeMessage) => void;

/** Shared broker simulating Redis pub/sub for memory and test providers. */
export class MemoryBroker {
  private readonly rooms = new Map<string, Set<RoomHandler>>();
  private readonly history = new Map<string, RealtimeMessage[]>();
  private readonly presence = new Map<string, Map<string, PresenceState>>();
  readonly retention: number;

  constructor(retention = 500) {
    this.retention = retention;
  }

  roomKey(channel: string, room: string): string {
    return `${channel}:${room}`;
  }

  subscribe(channel: string, room: string, handler: RoomHandler): () => void {
    const key = this.roomKey(channel, room);
    const set = this.rooms.get(key) ?? new Set();
    set.add(handler);
    this.rooms.set(key, set);
    return () => {
      set.delete(handler);
      if (set.size === 0) this.rooms.delete(key);
    };
  }

  publish(input: PublishInput): RealtimeMessage {
    const message: RealtimeMessage = {
      id: input.eventId ?? crypto.randomUUID(),
      type: input.type,
      channel: input.channel,
      room: input.room,
      data: input.data,
      timestamp: new Date().toISOString(),
    };

    const key = this.roomKey(input.channel, input.room);
    const hist = this.history.get(key) ?? [];
    hist.push(message);
    if (hist.length > this.retention) hist.splice(0, hist.length - this.retention);
    this.history.set(key, hist);

    const handlers = this.rooms.get(key);
    if (handlers) {
      for (const handler of handlers) handler(message);
    }
    return message;
  }

  replaySince(channel: string, room: string, lastEventId?: string): RealtimeMessage[] {
    const hist = this.history.get(this.roomKey(channel, room)) ?? [];
    if (!lastEventId) return [...hist];
    const idx = hist.findIndex((m) => m.id === lastEventId);
    if (idx === -1) return [...hist];
    return hist.slice(idx + 1);
  }

  setPresence(channel: string, room: string, state: PresenceState): void {
    const key = this.roomKey(channel, room);
    const map = this.presence.get(key) ?? new Map();
    map.set(state.userId, state);
    this.presence.set(key, map);
    this.publish({
      channel,
      room,
      type: "presence.updated",
      data: state,
    });
  }

  getPresence(channel: string, room: string): PresenceState[] {
    const map = this.presence.get(this.roomKey(channel, room));
    return map ? [...map.values()] : [];
  }
}

export function createMemoryProvider(
  broker = new MemoryBroker(),
  name = "memory",
): RealtimeProvider & { broker: MemoryBroker } {
  const capabilities: RealtimeProviderCapabilities = {
    multiInstance: false,
    persistence: true,
    presence: true,
  };

  return {
    name,
    capabilities,
    broker,
    async publish(input) {
      return broker.publish(input);
    },
    subscribe(channel, room, handler) {
      return broker.subscribe(channel, room, handler);
    },
    async setPresence(channel, room, state) {
      broker.setPresence(channel, room, state);
    },
    async getPresence(channel, room) {
      return broker.getPresence(channel, room);
    },
  };
}

/** Test provider — same as memory but named test. */
export function createTestProvider(broker?: MemoryBroker): RealtimeProvider & { broker: MemoryBroker } {
  return createMemoryProvider(broker ?? new MemoryBroker(), "test");
}

/** Multi-instance simulation: two providers sharing one broker (like Redis). */
export function createSharedBrokerProviders(count: number): Array<RealtimeProvider & { broker: MemoryBroker }> {
  const broker = new MemoryBroker();
  return Array.from({ length: count }, (_, i) => createMemoryProvider(broker, `instance-${i}`));
}
