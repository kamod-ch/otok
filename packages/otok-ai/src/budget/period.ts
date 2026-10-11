export const ORG_USER_SENTINEL = "__org__";

export function periodBounds(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function isWithinPeriod(now: Date, periodStart: string, periodEnd: string): boolean {
  const t = now.getTime();
  return t >= Date.parse(periodStart) && t < Date.parse(periodEnd);
}
