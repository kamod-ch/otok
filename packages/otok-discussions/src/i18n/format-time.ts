import type { DiscussionsI18n } from "./create.js";

export function formatCommentDateTime(i18n: DiscussionsI18n, iso: string): string {
  return i18n.date(iso, { dateStyle: "medium", timeStyle: "short" });
}

/** Relative label using the same reference instant as SSR (`nowIso`) to avoid hydration drift. */
export function formatCommentRelativeTime(i18n: DiscussionsI18n, iso: string, nowIso: string): string {
  const deltaMs = Date.parse(nowIso) - Date.parse(iso);
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return formatCommentDateTime(i18n, iso);
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return i18n.t("time.justNow");
  if (minutes < 60) return i18n.relativeTime(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return i18n.relativeTime(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 14) return i18n.relativeTime(-days, "day");
  return formatCommentDateTime(i18n, iso);
}
