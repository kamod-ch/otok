/**
 * Opt-in telemetry — no-op unless OTOK_TELEMETRY=1.
 * See docs/governance/telemetry.md
 */
export interface TelemetryEvent {
  event: string;
  otokVersion?: string;
  nodeVersion?: string;
  adapter?: string;
  pluginCount?: number;
  durationMs?: number;
  success?: boolean;
}

export function telemetryEnabled(): boolean {
  return process.env.OTOK_TELEMETRY === "1";
}

export function recordTelemetry(event: TelemetryEvent): void {
  if (!telemetryEnabled()) return;

  const payload = {
    ...event,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    telemetryId: process.env.OTOK_TELEMETRY_ID,
  };

  if (process.env.OTOK_TELEMETRY_DEBUG === "1") {
    process.stderr.write(`[otok:telemetry] ${JSON.stringify(payload)}\n`);
  }

  // Network transmission disabled until 1.0 GA endpoint is live.
}
