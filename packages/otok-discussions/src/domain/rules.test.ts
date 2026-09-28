import { describe, expect, it } from "vitest";
import {
  assertEditWindow,
  assertThreadAcceptsReplies,
  resolveEffectiveThreadStatus,
  resolveInitialCommentStatus,
} from "./rules.js";
import type { DiscussionComment, DiscussionThread } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";

const baseThread = (overrides: Partial<DiscussionThread> = {}): DiscussionThread => ({
  id: "t1",
  subject: { tenantId: "a", subjectType: "job", subjectId: "1" },
  title: "T",
  status: "open",
  opensAt: null,
  closesAt: null,
  replyCount: 0,
  pendingCount: 0,
  createdById: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  closedAt: null,
  archivedAt: null,
  pinnedAt: null,
  pinRank: null,
  ...overrides,
});

describe("resolveEffectiveThreadStatus", () => {
  it("opens scheduled threads when opensAt elapsed", () => {
    const thread = baseThread({ status: "scheduled", opensAt: "2026-01-01T00:00:00.000Z" });
    expect(resolveEffectiveThreadStatus(thread, "2026-01-02T00:00:00.000Z")).toBe("open");
  });

  it("auto-closes open threads when closesAt elapsed", () => {
    const thread = baseThread({ closesAt: "2026-01-01T12:00:00.000Z" });
    expect(resolveEffectiveThreadStatus(thread, "2026-01-02T00:00:00.000Z")).toBe("closed");
  });
});

describe("moderation modes", () => {
  it("pre mode yields pending", () => {
    expect(resolveInitialCommentStatus("pre", [], "trusted")).toBe("pending");
  });

  it("trusted role publishes in trusted mode", () => {
    expect(resolveInitialCommentStatus("trusted", ["trusted"], "trusted")).toBe("published");
    expect(resolveInitialCommentStatus("trusted", ["member"], "trusted")).toBe("published");
  });
});

describe("edit window", () => {
  it("blocks edits after window", () => {
    const comment: DiscussionComment = {
      id: "c1",
      threadId: "t1",
      subject: { tenantId: "a", subjectType: "job", subjectId: "1" },
      authorId: "u1",
      parentCommentId: null,
      status: "published",
      depth: 0,
      bodyMarkdown: "x",
      bodyHtml: "",
      revision: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
      isPlaceholder: false,
      scorePositive: 0,
      scoreNegative: 0,
      highlightedAt: null,
    };
    expect(() => assertEditWindow(comment, "2026-01-01T01:00:00.000Z", 900_000)).toThrow(DiscussionError);
  });
});

describe("reply rules", () => {
  it("rejects replies on read_only threads", () => {
    const thread = baseThread({ status: "read_only" });
    expect(() => assertThreadAcceptsReplies(thread, "2026-01-02T00:00:00.000Z")).toThrow(DiscussionError);
  });
});
