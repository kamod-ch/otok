/** Minimal five-field cron matcher (minute hour dom month dow, UTC). */
export function cronMatches(expression: string, date: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dom, month, dow] = parts;
  return (
    matchField(minute, date.getUTCMinutes(), 0, 59) &&
    matchField(hour, date.getUTCHours(), 0, 23) &&
    matchField(dom, date.getUTCDate(), 1, 31) &&
    matchField(month, date.getUTCMonth() + 1, 1, 12) &&
    matchField(dow, date.getUTCDay(), 0, 6)
  );
}

function matchField(pattern: string, value: number, min: number, _max: number): boolean {
  if (pattern === "*") return true;
  return pattern.split(",").some((segment) => {
    if (segment.includes("/")) {
      const [base, stepRaw] = segment.split("/");
      const step = Number(stepRaw);
      if (!step) return false;
      const start = base === "*" ? min : Number(base);
      return value >= start && (value - start) % step === 0;
    }
    if (segment.includes("-")) {
      const [startRaw, endRaw] = segment.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      return value >= start && value <= end;
    }
    return Number(segment) === value;
  });
}

/** UTC minute bucket for schedule deduplication. */
export function cronFireAtUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()),
  );
}
