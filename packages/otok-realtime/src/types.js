export const DEFAULT_REALTIME_LIMITS = {
    maxConnectionsPerUser: 10,
    maxConnectionsPerIp: 30,
    maxPendingEventsPerConnection: 100,
    maxConnectionsGlobal: 10_000,
    rateLimitPerMinute: 120,
};
