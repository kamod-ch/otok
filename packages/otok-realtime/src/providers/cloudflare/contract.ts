/** Defaults aligned with plans/cloudflare-realtime-contract.json */

export const CLOUDFLARE_REALTIME_RETENTION = {
  maxEventsPerRoom: 500,
  maxAgeMs: 86_400_000,
} as const;

export const CLOUDFLARE_REALTIME_LIFECYCLE = {
  heartbeatIntervalMs: 25_000,
  maxPendingEventsPerConnection: 100,
  alarmSweepIntervalMs: 300_000,
} as const;

export const INTERNAL_HEADER = "x-otok-realtime-internal";
