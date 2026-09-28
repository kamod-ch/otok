import { describe, expect, it } from "vitest";
import { createDiscussionsI18n } from "./create.js";
import { discussionLabelsFromI18n } from "./labels.js";
import { formatCommentRelativeTime } from "./format-time.js";

describe("i18n SSR/hydration alignment", () => {
  const nowIso = "2026-06-01T12:00:00.000Z";
  const createdAt = "2026-06-01T11:30:00.000Z";

  it("produces identical charCount strings when locale is recreated on client", () => {
    const server = discussionLabelsFromI18n(createDiscussionsI18n({ locale: "en" }));
    const client = discussionLabelsFromI18n(createDiscussionsI18n({ locale: "en" }));
    expect(server.charCount(12, 10_000)).toBe(client.charCount(12, 10_000));
    expect(server.charCount(12, 10_000)).toMatch(/12.*10.*000.*character/i);
  });

  it("formats relative time deterministically from nowIso", () => {
    const i18n = createDiscussionsI18n({ locale: "de" });
    const a = formatCommentRelativeTime(i18n, createdAt, nowIso);
    const b = formatCommentRelativeTime(createDiscussionsI18n({ locale: "de" }), createdAt, nowIso);
    expect(a).toBe(b);
    expect(a).toContain("Min");
  });
});
