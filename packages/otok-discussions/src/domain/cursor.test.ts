import { describe, expect, it } from "vitest";
import { assertCommentCursorScope, decodeCommentCursor, encodeCommentCursor } from "./cursor.js";
import { DiscussionError } from "../types/errors.js";

const subject = { tenantId: "tenant-a", subjectType: "doc", subjectId: "d1" };

describe("comment cursors", () => {
  it("round-trips newest cursor", () => {
    const raw = encodeCommentCursor({
      sort: "newest",
      subject,
      threadId: "thread-1",
      anchor: { id: "c1", createdAt: "2026-01-01T00:00:00.000Z" },
    });
    const decoded = decodeCommentCursor(raw);
    expect(decoded.threadId).toBe("thread-1");
    expect(decoded.sort).toBe("newest");
  });

  it("requires score for top sort", () => {
    const raw = Buffer.from(
      JSON.stringify({
        v: 1,
        sort: "top",
        tenantId: subject.tenantId,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        threadId: "thread-1",
        anchor: { id: "c1", createdAt: "2026-01-01T00:00:00.000Z" },
      }),
      "utf8",
    ).toString("base64url");
    expect(() => decodeCommentCursor(raw)).toThrow(DiscussionError);
  });

  it("rejects cross-tenant reuse", () => {
    const raw = encodeCommentCursor({
      sort: "oldest",
      subject,
      threadId: "thread-1",
      anchor: { id: "c1", createdAt: "2026-01-01T00:00:00.000Z" },
    });
    const decoded = decodeCommentCursor(raw);
    expect(() =>
      assertCommentCursorScope(
        decoded,
        { tenantId: "other", subjectType: "doc", subjectId: "d1" },
        "thread-1",
        "oldest",
      ),
    ).toThrow(DiscussionError);
  });

  it("rejects sort mismatch", () => {
    const raw = encodeCommentCursor({
      sort: "newest",
      subject,
      threadId: "thread-1",
      anchor: { id: "c1", createdAt: "2026-01-01T00:00:00.000Z" },
    });
    const decoded = decodeCommentCursor(raw);
    expect(() => assertCommentCursorScope(decoded, subject, "thread-1", "oldest")).toThrow(DiscussionError);
  });
});
