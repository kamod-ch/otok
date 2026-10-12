import type { PresenceState, PublishInput, RealtimeMessage, RealtimeProvider } from "../types.js";
type RoomHandler = (message: RealtimeMessage) => void;
/** Shared broker simulating Redis pub/sub for memory and test providers. */
export declare class MemoryBroker {
  private readonly rooms;
  private readonly history;
  private readonly presence;
  readonly retention: number;
  constructor(retention?: number);
  roomKey(channel: string, room: string): string;
  subscribe(channel: string, room: string, handler: RoomHandler): () => void;
  publish(input: PublishInput): RealtimeMessage;
  replaySince(channel: string, room: string, lastEventId?: string): RealtimeMessage[];
  setPresence(channel: string, room: string, state: PresenceState): void;
  getPresence(channel: string, room: string): PresenceState[];
}
export declare function createMemoryProvider(
  broker?: MemoryBroker,
  name?: string,
): RealtimeProvider & {
  broker: MemoryBroker;
};
/** Test provider — same as memory but named test. */
export declare function createTestProvider(broker?: MemoryBroker): RealtimeProvider & {
  broker: MemoryBroker;
};
/** Multi-instance simulation: two providers sharing one broker (like Redis). */
export declare function createSharedBrokerProviders(count: number): Array<
  RealtimeProvider & {
    broker: MemoryBroker;
  }
>;
export {};
//# sourceMappingURL=memory.d.ts.map
