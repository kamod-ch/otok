import { RealtimeException } from "./errors.js";
export class RealtimeHub {
  provider;
  limits;
  heartbeatIntervalMs;
  connections = new Map();
  userConnections = new Map();
  ipConnections = new Map();
  rateBuckets = new Map();
  heartbeatTimer;
  constructor(options) {
    this.provider = options.provider;
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
    this.startHeartbeat();
  }
  get connectionCount() {
    return this.connections.size;
  }
  async connect(options) {
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
    const pending = [];
    const conn = {
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
        return this.enqueue(conn, message, options.push);
      },
      close: (code, reason) => {
        this.disconnect(connectionId, code, reason);
      },
    };
    conn.unsubscribe = this.provider.subscribe(options.channel.name, options.room, (message) => {
      if (conn.closed) return;
      conn.push(message);
    });
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
  async publish(channel, room, type, data) {
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
    });
  }
  async updatePresence(channel, room, state) {
    if (!this.provider.setPresence) return;
    await this.provider.setPresence(channel, room, state);
  }
  async getPresence(channel, room) {
    if (!this.provider.getPresence) return [];
    return this.provider.getPresence(channel, room);
  }
  async shutdown() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const conn of this.connections.values()) {
      conn.close("SERVER_SHUTDOWN", "Server shutting down");
    }
    await this.provider.shutdown?.();
  }
  /** Access underlying broker for tests when using memory provider. */
  getBroker() {
    const p = this.provider;
    return p.broker;
  }
  enqueue(conn, message, push) {
    if (conn.pending.length >= this.limits.maxPendingEventsPerConnection) {
      conn.pending.shift();
      push({ code: "BACKPRESSURE", message: "Event queue overflow — oldest event dropped" });
    }
    conn.pending.push(message);
    conn.lastEventId = message.id;
    return push(message);
  }
  replayMissedEvents(conn, channel, room, lastEventId, push) {
    const broker = this.getBroker();
    if (!broker || !lastEventId) return;
    const missed = broker.replaySince(channel.name, room, lastEventId);
    for (const message of missed) {
      push(message);
      conn.lastEventId = message.id;
    }
  }
  registerConnection(conn, ip) {
    this.connections.set(conn.id, conn);
    track(this.userConnections, conn.userId, conn.id);
    if (ip) track(this.ipConnections, ip, conn.id);
  }
  disconnect(connectionId, code, reason) {
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
  async broadcastPresence(channel, room, state) {
    if (this.provider.setPresence) {
      await this.provider.setPresence(channel, room, state);
    }
  }
  assertConnectionLimits(userId, ip) {
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
  assertRateLimit(userId) {
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
  startHeartbeat() {
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
const DEFAULT_LIMITS = {
  maxConnectionsPerUser: 10,
  maxConnectionsPerIp: 30,
  maxPendingEventsPerConnection: 100,
  maxConnectionsGlobal: 10_000,
  rateLimitPerMinute: 120,
};
function track(map, key, id) {
  const set = map.get(key) ?? new Set();
  set.add(id);
  map.set(key, set);
}
function untrack(map, key, id) {
  const set = map.get(key);
  if (!set) return;
  set.delete(id);
  if (set.size === 0) map.delete(key);
}
