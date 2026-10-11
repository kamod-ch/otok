import type { ChannelDefinition, ConnectOptions, PresenceState, RealtimeConnection, RealtimeHubOptions, RealtimeMessage } from "./types.js";
import type { MemoryBroker } from "./providers/memory.js";
export declare class RealtimeHub {
    private readonly provider;
    private readonly limits;
    private readonly heartbeatIntervalMs;
    private readonly connections;
    private readonly userConnections;
    private readonly ipConnections;
    private readonly rateBuckets;
    private heartbeatTimer?;
    constructor(options: RealtimeHubOptions);
    get connectionCount(): number;
    connect(options: ConnectOptions): Promise<RealtimeConnection>;
    publish<T>(channel: ChannelDefinition<T>, room: string, type: string, data: T): Promise<RealtimeMessage<T>>;
    updatePresence(channel: string, room: string, state: PresenceState): Promise<void>;
    getPresence(channel: string, room: string): Promise<PresenceState[]>;
    shutdown(): Promise<void>;
    /** Access underlying broker for tests when using memory provider. */
    getBroker(): MemoryBroker | undefined;
    private enqueue;
    private replayMissedEvents;
    private registerConnection;
    private disconnect;
    private broadcastPresence;
    private assertConnectionLimits;
    private assertRateLimit;
    private startHeartbeat;
}
//# sourceMappingURL=hub.d.ts.map