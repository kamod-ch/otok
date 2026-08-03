import type {
  ChannelDefinition,
  ConnectOptions,
  PresenceState,
  RealtimeConnection,
  RealtimeHubOptions,
  RealtimeLimits,
  RealtimeMessage,
} from "./types.js";
import { RealtimeException } from "./errors.js";
import type { MemoryBroker } from "./providers/memory.js";

interface ActiveConnection extends RealtimeConnection {
  pending: RealtimeMessage[];
  unsubscribe: () => void;
  closed: boolean;
}

export class RealtimeHub {
  private readonly provider;
  private readonly limits: RealtimeLimits;
  private readonly heartbeatIntervalMs: number;
  private readonly connections = new Map<string, ActiveConnection>();
  private readonly userConnections = new Map<string, Set<string>>();
  private readonly ipConnections = new Map<string, Set<string>>();
  private readonly rateBuckets = new Map<string, { count: number; resetAt: number }>();
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(options: RealtimeHubOptions) {
    this.provider = options.provider;
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
    this.startHeartbeat();
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  async connect(options: ConnectOptions): Promise<RealtimeConnection> {
    this.assertConnectionLimits(options.user.id, options.ip);
    this.assertRateLimit(options.user.id);

    const allowed = await options.channel.authorize({
      user: options.user,
      channel: options.channel.name,
      room: options.room,
      requestId: options.requestId,
      transport: options.transport,
    });
    if (!allowed) {
      throw new RealtimeException("FORBIDDEN", `Not authorized for channel "${options.channel.name}"`);
    }

    const connectionId = crypto.randomUUID();
    const pending: RealtimeMessage[] = [];

    const conn: ActiveConnection = {
      id: connectionId,
      userId: options.user.id,
      channel: options.channel.name,
      room: options.room,
      transport: options.transport,
      connectedAt: new Date().toISOString(),
      lastEventId: options.lastEventId,
      pending,
      closed: false,
      unsubscribe: () => {},
      push: (message) => {
        if ("code" in message && "message" in message && !("channel" in message)) {
          return options.push(message);
        }
        return this.enqueue(conn, message as RealtimeMessage, options.push);
      },
      close: (code, reason) => {
        this.disconnect(connectionId, code, reason);
      },
    };

    conn.unsubscribe = this.provider.subscribe(
      options.channel.name,
      options.room,
      (message) => {
        if (conn.closed) return;
        conn.push(message);
      },
    );

    this.registerConnection(conn, options.ip);
    this.replayMissedEvents(conn, options.channel, options.room, options.lastEventId, options.push);

    await this.broadcastPresence(options.channel.name, options.room, {
      userId: options.user.id,
      status: "online",
      lastSeenAt: new Date().toISOString(),
    });

    const userOnClose = options.onClose;
    options.onClose = () => {
      this.disconnect(connectionId);
      userOnClose();
    };
    return conn;
  }

  async publish<T>(
    channel: ChannelDefinition<T>,
    room: string,
    type: string,
    data: T,
  ): Promise<RealtimeMessage<T>> {
    if (channel.schema) {
      const parsed = channel.schema.safeParse(data);
      if (!parsed.success) {
        throw new RealtimeException("PROTOCOL_ERROR", parsed.error.message);
      }
      data = parsed.data;
    }
    return this.provider.publish({
      channel: channel.name,
      room,
      type,
      data,
    }) as Promise<RealtimeMessage<T>>;
  }

  async updatePresence(
    channel: string,
    room: string,
    state: PresenceState,
  ): Promise<void> {
    if (!this.provider.setPresence) return;
    await this.provider.setPresence(channel, room, state);
  }

  async getPresence(channel: string, room: string): Promise<PresenceState[]> {
    if (!this.provider.getPresence) return [];
    return this.provider.getPresence(channel, room);
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const conn of [...this.connections.values()]) {
      conn.close("SERVER_SHUTDOWN", "Server shutting down");
    }
    await this.provider.shutdown?.();
  }

  /** Access underlying broker for tests when using memory provider. */
  getBroker(): MemoryBroker | undefined {
    const p = this.provider as { broker?: MemoryBroker };
    return p.broker;
  }

  private enqueue(
    conn: ActiveConnection,
    message: RealtimeMessage,
    push: ConnectOptions["push"],
  ): boolean {
    if (conn.pending.length >= this.limits.maxPendingEventsPerConnection) {
      conn.pending.shift();
      push({ code: "BACKPRESSURE", message: "Event queue overflow — oldest event dropped" });
    }
    conn.pending.push(message);
    conn.lastEventId = message.id;
    return push(message);
  }

  private replayMissedEvents(
    conn: ActiveConnection,
    channel: ChannelDefinition,
    room: string,
    lastEventId: string | undefined,
    push: ConnectOptions["push"],
  ): void {
    const broker = this.getBroker();
    if (!broker || !lastEventId) return;
    const missed = broker.replaySince(channel.name, room, lastEventId);
    for (const message of missed) {
      push(message);
      conn.lastEventId = message.id;
    }
  }

  private registerConnection(conn: ActiveConnection, ip?: string): void {
    this.connections.set(conn.id, conn);
    track(this.userConnections, conn.userId, conn.id);
    if (ip) track(this.ipConnections, ip, conn.id);
  }

  private disconnect(connectionId: string, code?: string, reason?: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn || conn.closed) return;
    conn.closed = true;
    conn.unsubscribe();
    this.connections.delete(connectionId);
    untrack(this.userConnections, conn.userId, connectionId);
    void this.broadcastPresence(conn.channel, conn.room, {
      userId: conn.userId,
      status: "offline",
      lastSeenAt: new Date().toISOString(),
    });
    void code;
    void reason;
  }

  private async broadcastPresence(channel: string, room: string, state: PresenceState): Promise<void> {
    if (this.provider.setPresence) {
      await this.provider.setPresence(channel, room, state);
    }
  }

  private assertConnectionLimits(userId: string, ip?: string): void {
    if (this.connections.size >= this.limits.maxConnectionsGlobal) {
      throw new RealtimeException("CONNECTION_LIMIT", "Global connection limit reached");
    }
    const userCount = this.userConnections.get(userId)?.size ?? 0;
    if (userCount >= this.limits.maxConnectionsPerUser) {
      throw new RealtimeException("CONNECTION_LIMIT", "Per-user connection limit reached");
    }
    if (ip) {
      const ipCount = this.ipConnections.get(ip)?.size ?? 0;
      if (ipCount >= this.limits.maxConnectionsPerIp) {
        throw new RealtimeException("CONNECTION_LIMIT", "Per-IP connection limit reached");
      }
    }
  }

  private assertRateLimit(userId: string): void {
    const now = Date.now();
    const bucket = this.rateBuckets.get(userId);
    const windowMs = 60_000;
    if (!bucket || bucket.resetAt <= now) {
      this.rateBuckets.set(userId, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count += 1;
    if (bucket.count > this.limits.rateLimitPerMinute) {
      throw new RealtimeException("RATE_LIMITED", "Too many connection attempts", bucket.resetAt - now);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const conn of this.connections.values()) {
        if (conn.closed) continue;
        conn.push({
          id: `heartbeat-${Date.now()}`,
          type: "heartbeat",
          channel: conn.channel,
          room: conn.room,
          data: { ts: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      }
    }, this.heartbeatIntervalMs);
  }
}

const DEFAULT_LIMITS: RealtimeLimits = {
  maxConnectionsPerUser: 10,
  maxConnectionsPerIp: 30,
  maxPendingEventsPerConnection: 100,
  maxConnectionsGlobal: 10_000,
  rateLimitPerMinute: 120,
};

function track(map: Map<string, Set<string>>, key: string, id: string): void {
  const set = map.get(key) ?? new Set();
  set.add(id);
  map.set(key, set);
}

function untrack(map: Map<string, Set<string>>, key: string, id: string): void {
  const set = map.get(key);
  if (!set) return;
  set.delete(id);
  if (set.size === 0) map.delete(key);
}
