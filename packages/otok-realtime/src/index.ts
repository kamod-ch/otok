export { defineChannel, isChannelDefinition, z } from "./define-channel.js";
export type {
  ChannelDefinition,
  RealtimeMessage,
  RealtimeUser,
  RealtimeProvider,
  RealtimeLimits,
  RealtimeError,
  RealtimeErrorCode,
  PresenceState,
  RealtimeTransport,
  InferChannelEvent,
  DurableObjectRealtimeContract,
} from "./types.js";
export { DEFAULT_REALTIME_LIMITS } from "./types.js";
export { RealtimeException, isRealtimeError, formatRealtimeError } from "./errors.js";
export { resolveAuthToken, redactTokens, createBearerVerifier } from "./auth.js";
export type { BearerTokenVerifier } from "./auth.js";
export type { AuthTokenResult } from "./types.js";

export { RealtimeHub } from "./hub.js";
export { createMemoryProvider, createSharedBrokerProviders } from "./providers/memory.js";
export { createRedisProvider } from "./providers/redis.js";
export type { RedisPubSubAdapter } from "./providers/redis.js";
export { defineDurableObjectProvider, DEFAULT_DURABLE_OBJECT_CONTRACT } from "./providers/durable-objects.js";

export { registerRealtimeRoutes, handleWebSocketConnection } from "./routes.js";
export type { RealtimeRoutesOptions } from "./routes.js";

export { realtime, getRealtimeRuntime, registerRealtimeRuntime, resetRealtimeRuntimeForTests } from "./registry.js";

export { createSseStream, formatSseEvent, sseResponse } from "./transport/sse.js";
export { encodeWsFrame, decodeWsFrame } from "./transport/websocket.js";

export { companiesChannel, crmChannels, crmPresenceChannel } from "./crm/index.js";
export type { CompanyActivityEvent } from "./crm/index.js";

export { RealtimeClient, fetchSseClient } from "./client/index.js";
export type { RealtimeClientOptions, RealtimeClientEvent } from "./client/index.js";
