import type { ZodType } from "zod";

export interface RealtimeUser {
  id: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthorizeContext {
  user: RealtimeUser | null;
  channel: string;
  room?: string;
  requestId?: string;
  transport: RealtimeTransport;
}

export type RealtimeTransport = "sse" | "websocket";

export interface ChannelDefinition<TEvent = unknown> {
  readonly __kind: "otok-realtime-channel";
  readonly name: string;
  readonly schema?: ZodType<TEvent>;
  readonly authorize: (ctx: AuthorizeContext) => boolean | Promise<boolean>;
  readonly maxRoomSize?: number;
}

export interface RealtimeMessage<T = unknown> {
  id: string;
  type: string;
  channel: string;
  room: string;
  data: T;
  timestamp: string;
}

export interface PresenceState {
  userId: string;
  status: "online" | "away" | "offline";
  metadata?: Record<string, unknown>;
  lastSeenAt: string;
}

export interface RealtimeConnection {
  id: string;
  userId: string;
  channel: string;
  room: string;
  transport: RealtimeTransport;
  connectedAt: string;
  lastEventId?: string;
  push(message: RealtimeMessage): boolean;
  close(code?: RealtimeErrorCode, reason?: string): void;
}

export type RealtimeErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "CONNECTION_LIMIT"
  | "BACKPRESSURE"
  | "INVALID_TOKEN"
  | "CHANNEL_NOT_FOUND"
  | "ROOM_FULL"
  | "PROTOCOL_ERROR"
  | "SERVER_SHUTDOWN";

export interface RealtimeError {
  code: RealtimeErrorCode;
  message: string;
  retryAfterMs?: number;
}

export interface RealtimeLimits {
  maxConnectionsPerUser: number;
  maxConnectionsPerIp: number;
  maxPendingEventsPerConnection: number;
  maxConnectionsGlobal: number;
  rateLimitPerMinute: number;
}

export const DEFAULT_REALTIME_LIMITS: RealtimeLimits = {
  maxConnectionsPerUser: 10,
  maxConnectionsPerIp: 30,
  maxPendingEventsPerConnection: 100,
  maxConnectionsGlobal: 10_000,
  rateLimitPerMinute: 120,
};

export interface RealtimeProviderCapabilities {
  multiInstance: boolean;
  persistence: boolean;
  presence: boolean;
}

export interface PublishInput {
  channel: string;
  room: string;
  type: string;
  data: unknown;
  eventId?: string;
}

export interface RealtimeProvider {
  readonly name: string;
  readonly capabilities: RealtimeProviderCapabilities;
  publish(input: PublishInput): Promise<RealtimeMessage>;
  subscribe(
    channel: string,
    room: string,
    handler: (message: RealtimeMessage) => void,
  ): () => void;
  setPresence?(channel: string, room: string, state: PresenceState): Promise<void>;
  getPresence?(channel: string, room: string): Promise<PresenceState[]>;
  shutdown?(): Promise<void>;
}

export interface RealtimeHubOptions {
  provider: RealtimeProvider;
  limits?: Partial<RealtimeLimits>;
  heartbeatIntervalMs?: number;
  eventRetention?: number;
}

export interface ConnectOptions {
  user: RealtimeUser;
  channel: ChannelDefinition;
  room: string;
  transport: RealtimeTransport;
  ip?: string;
  requestId?: string;
  lastEventId?: string;
  push: (message: RealtimeMessage | RealtimeError) => boolean;
  onClose: () => void;
}

export type InferChannelEvent<T> = T extends ChannelDefinition<infer E> ? E : never;

export interface RealtimeRuntime {
  hub: import("./hub.js").RealtimeHub;
  channels: Map<string, ChannelDefinition>;
}

export interface AuthTokenResult {
  user: RealtimeUser | null;
  source: "bearer" | "session" | "none";
}

export interface DurableObjectRealtimeContract {
  /** Unique Durable Object name per room or channel shard. */
  objectName(channel: string, room: string): string;
  /** HTTP path the worker forwards upgrade/SSE requests to. */
  routePattern: string;
  /** Serialize messages for DO storage/replay. */
  serialize(message: RealtimeMessage): string;
  deserialize(raw: string): RealtimeMessage;
}
