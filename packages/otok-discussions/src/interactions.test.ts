import { describe, expect, it } from "vitest";
import {
  clearDiscussionDraft,
  parseDiscussionDraft,
  readDiscussionDraft,
  serializeDiscussionDraft,
  writeDiscussionDraft,
} from "./ui/browser/draft-storage.js";
import { resolveCommentPermissions } from "./ui/comment-permissions.js";
import { discussionsThreadViewUrl } from "./ui/thread-url.js";

describe("discussion interactions", () => {
  it("round-trips versioned drafts as untrusted data", () => {
    const raw = serializeDiscussionDraft("hello");
    expect(parseDiscussionDraft(raw)?.body).toBe("hello");
    expect(parseDiscussionDraft('{"v":999,"body":"x","savedAt":"t"}')).toBeNull();
  });

  it("stores drafts in localStorage when available", () => {
    const store = new Map<string, string>();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
    writeDiscussionDraft("thread-1:root", "draft text");
    expect(readDiscussionDraft("thread-1:root")?.body).toBe("draft text");
    clearDiscussionDraft("thread-1:root");
    expect(readDiscussionDraft("thread-1:root")).toBeNull();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  });

  it("builds sortable thread urls without javascript", () => {
    expect(discussionsThreadViewUrl("/discussions", "job-1", { sort: "top" })).toBe(
      "/discussions/job-1/thread?sort=top",
    );
    expect(discussionsThreadViewUrl("/discussions", "job-1", { sort: "newest", cursor: "abc" })).toBe(
      "/discussions/job-1/thread?cursor=abc",
    );
  });

  it("respects edit window for own comments", () => {
    const now = "2026-06-01T12:00:00.000Z";
    const createdAt = "2026-06-01T11:00:00.000Z";
    const perms = resolveCommentPermissions({
      comment: {
        authorId: "u1",
        status: "published",
        isPlaceholder: false,
        depth: 0,
        createdAt,
      },
      viewerUserId: "u1",
      isModerator: false,
      threadAllowsMutation: true,
      maxDepth: 3,
      rules: { editWindowMs: 3_600_000 },
      nowIso: now,
    });
    expect(perms.canEdit).toBe(true);
    expect(
      resolveCommentPermissions({
        comment: {
          authorId: "u1",
          status: "published",
          isPlaceholder: false,
          depth: 0,
          createdAt: "2026-06-01T08:00:00.000Z",
        },
        viewerUserId: "u1",
        isModerator: false,
        threadAllowsMutation: true,
        maxDepth: 3,
        rules: { editWindowMs: 3_600_000 },
        nowIso: now,
      }).canEdit,
    ).toBe(false);
  });
});
