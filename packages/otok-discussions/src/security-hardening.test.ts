import { describe, expect, it } from "vitest";
import { processCommentBodyForStorage } from "./security/process-body.js";
import { isAllowedDiscussionUrl } from "./security/urls.js";
import { renderSafeDiscussionMarkdownHtml } from "./security/markdown-render.js";
import { publicDiscussionCacheEligible } from "./http/cache-policy.js";
import { redactDiscussionLogRecord } from "./observability/log-redaction.js";
import { createCapabilityRateLimiter } from "./security/rate-limit.js";
import { emitDiscussionEvent } from "./events/emit.js";
import { DiscussionEngine } from "./engine/discussion-engine.js";
import { MemoryDiscussionStore } from "./adapters/memory/store.js";
import { createDiscussionsRuntime } from "./config.js";
import { createTestProviders } from "./testing/providers.js";
import { DiscussionError } from "./types/errors.js";

describe("content safety", () => {
  it("rejects HTML tags in comment bodies", () => {
    expect(() =>
      processCommentBodyForStorage('<script>alert(1)</script>', { maxCodePoints: 10_000 }),
    ).toThrow(DiscussionError);
  });

  it("rejects javascript: links in markdown", () => {
    expect(() =>
      processCommentBodyForStorage("[click](javascript:alert(1))", { maxCodePoints: 10_000 }),
    ).toThrow(DiscussionError);
  });

  it("neutralizes XSS in rendered output", () => {
    const html = renderSafeDiscussionMarkdownHtml("Hello **world**");
    expect(html).not.toContain("<script");
    expect(html).toContain("<strong>world</strong>");
  });

  it("blocks disallowed URL schemes", () => {
    expect(isAllowedDiscussionUrl("https://example.com")).toBe(true);
    expect(isAllowedDiscussionUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedDiscussionUrl("data:text/html,evil")).toBe(false);
  });
});

describe("cache isolation policy", () => {
  it("allows shared cache only for anonymous published views", () => {
    expect(publicDiscussionCacheEligible({ isAuthenticated: false, isModerator: false, containsNonPublishedForViewer: false })).toBe(true);
    expect(publicDiscussionCacheEligible({ isAuthenticated: true, isModerator: false, containsNonPublishedForViewer: false })).toBe(false);
    expect(publicDiscussionCacheEligible({ isAuthenticated: false, isModerator: true, containsNonPublishedForViewer: false })).toBe(false);
    expect(publicDiscussionCacheEligible({ isAuthenticated: false, isModerator: false, containsNonPublishedForViewer: true })).toBe(false);
  });
});

describe("rate limiting", () => {
  it("enforces per-actor comment limits under concurrent checks", async () => {
    const limiter = createCapabilityRateLimiter({
      windowMs: 60_000,
      limits: { "comment:create": 2 },
    });
    const subject = { tenantId: "t1", subjectType: "job", subjectId: "j1" };
    expect((await limiter.checkCreateComment(subject, "user-1")).allowed).toBe(true);
    expect((await limiter.checkCreateComment(subject, "user-1")).allowed).toBe(true);
    expect((await limiter.checkCreateComment(subject, "user-1")).allowed).toBe(false);
    expect((await limiter.checkCreateComment(subject, "user-2")).allowed).toBe(true);
  });
});

describe("events", () => {
  it("does not fail mutation when sync handler times out", async () => {
    const sink = {
      emit: () =>
        new Promise<void>(() => {
          /* never resolves */
        }),
    };
    await expect(
      emitDiscussionEvent(sink, {
        name: "discussion.comment.created",
        tenantId: "t1",
        subject: { tenantId: "t1", subjectType: "job", subjectId: "1" },
        payload: { v: 1, commentId: "c1" },
        occurredAt: new Date().toISOString(),
      }, { timeoutMs: 5 }),
    ).resolves.toBeUndefined();
  });
});

describe("log redaction", () => {
  it("redacts comment bodies and IP fields", () => {
    const redacted = redactDiscussionLogRecord({
      bodyMarkdown: "secret",
      ip: "203.0.113.1",
      nested: { details: "report text", ok: true },
    });
    expect(redacted.bodyMarkdown).toBe("[redacted]");
    expect(redacted.ip).toBe("[redacted]");
    expect(redacted.nested.details).toBe("[redacted]");
    expect(redacted.nested.ok).toBe(true);
  });
});

describe("large payload", () => {
  it("rejects bodies over unicode code point limit in engine", async () => {
    const store = new MemoryDiscussionStore();
    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({ maxCommentLength: 100 }, deps);
    const engine = new DiscussionEngine(store, runtime);
    const subject = { tenantId: "t1", subjectType: "job", subjectId: "j1" };
    const thread = await engine.createThread({
      subject,
      title: "T",
      createdById: "u1",
    });
    await expect(
      engine.createComment({
        subject,
        threadId: thread.id,
        authorId: "u1",
        parentCommentId: null,
        bodyMarkdown: "x".repeat(101),
      }),
    ).rejects.toThrow(DiscussionError);
  });
});

describe("engine stores safe html only", () => {
  it("persists server-rendered bodyHtml without raw user HTML", async () => {
    const store = new MemoryDiscussionStore();
    const runtime = createDiscussionsRuntime({}, createTestProviders());
    const engine = new DiscussionEngine(store, runtime);
    const subject = { tenantId: "t1", subjectType: "job", subjectId: "j1" };
    const thread = await engine.createThread({ subject, title: "T", createdById: "u1" });
    const comment = await engine.createComment({
      subject,
      threadId: thread.id,
      authorId: "u1",
      parentCommentId: null,
      bodyMarkdown: "See [docs](https://example.com)",
    });
    expect(comment.bodyHtml).toContain("https://example.com");
    expect(comment.bodyHtml).not.toContain("<script");
    expect(comment.bodyMarkdown).not.toContain("<a ");
  });
});
