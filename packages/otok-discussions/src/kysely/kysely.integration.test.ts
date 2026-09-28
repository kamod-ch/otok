import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { createTestProviders } from "../testing/providers.js";
import { createKyselyDiscussionAdapter } from "./adapter.js";
import { listReplyPreviewsByParents } from "./comment-queries.js";
import type { DiscussionsDatabase } from "./schema.js";
import { migrateDiscussionsSchema, rollbackDiscussionsSchema } from "./migrate.js";
import { createPostgresDiscussionsDb, createSqliteDiscussionsDb } from "./test-harness.js";

const pgUrl = process.env.OTOK_DISCUSSIONS_PG_TEST_URL;

function makeAdapter(db: Kysely<DiscussionsDatabase>) {
  const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
  return createKyselyDiscussionAdapter({ db, deps, config: { moderationMode: "post", maxDepth: 4 } });
}

const subjectA = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };
const subjectB = { tenantId: "tenant-b", subjectType: "job", subjectId: "job-1" };

function registerSharedIntegrationTests(label: string, getDb: () => Kysely<DiscussionsDatabase>) {
  describe(`kysely discussions (${label})`, () => {
    afterEach(async () => {
      const db = getDb();
      await db.deleteFrom("discussions_moderation_actions").execute();
      await db.deleteFrom("discussions_reports").execute();
      await db.deleteFrom("discussions_reactions").execute();
      await db.deleteFrom("discussions_comment_revisions").execute();
      await db.deleteFrom("discussions_comments").execute();
      await db.deleteFrom("discussions_threads").execute();
    });

    it("isolates tenants — tenant B cannot read tenant A thread", async () => {
      const adapter = makeAdapter(getDb());
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "Secret", createdById: "u1" });
      const cross = await adapter.read!.getThread(subjectB, thread.id);
      expect(cross).toBeNull();
    });

    it("isolates tenants — tenant B cannot mutate tenant A comment", async () => {
      const adapter = makeAdapter(getDb());
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "T", createdById: "u1" });
      const comment = await adapter.mutate!.createComment({
        subject: subjectA,
        threadId: thread.id,
        authorId: "u1",
        bodyMarkdown: "hello",
      });
      await expect(
        adapter.mutate!.addReaction(subjectB, comment.id, "evil", "👍"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("keeps reply counters when creating comments in parallel", async () => {
      const adapter = makeAdapter(getDb());
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "T", createdById: "u1" });
      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          adapter.mutate!.createComment({
            subject: subjectA,
            threadId: thread.id,
            authorId: `u-${i}`,
            bodyMarkdown: `c-${i}`,
          }),
        ),
      );
      const updated = await adapter.read!.getThread(subjectA, thread.id);
      expect(updated?.replyCount).toBe(8);
    });

    it("allows only one active reaction per actor (concurrent race)", async () => {
      const adapter = makeAdapter(getDb());
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "T", createdById: "u1" });
      const comment = await adapter.mutate!.createComment({
        subject: subjectA,
        threadId: thread.id,
        authorId: "u1",
        bodyMarkdown: "vote",
      });
      const results = await Promise.allSettled([
        adapter.mutate!.addReaction(subjectA, comment.id, "voter", "👍"),
        adapter.mutate!.addReaction(subjectA, comment.id, "voter", "👎"),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
      expect(fulfilled.length + rejected.length).toBe(2);
      const reactions = await adapter.read!.listReactions!(subjectA, comment.id);
      expect(reactions.filter((r) => r.actorId === "voter")).toHaveLength(1);
      const refreshed = await adapter.read!.getComment(subjectA, comment.id);
      expect((refreshed?.scorePositive ?? 0) + (refreshed?.scoreNegative ?? 0)).toBeLessThanOrEqual(1);
    });

    it("dedupes open reports", async () => {
      const adapter = makeAdapter(getDb());
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "T", createdById: "u1" });
      await adapter.moderate!.createReport({
        subject: subjectA,
        targetType: "thread",
        targetId: thread.id,
        reporterId: "r1",
        reason: "spam",
      });
      await expect(
        adapter.moderate!.createReport({
          subject: subjectA,
          targetType: "thread",
          targetId: thread.id,
          reporterId: "r1",
          reason: "spam again",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("lists root comments and batched reply previews without per-root queries in app code", async () => {
      const db = getDb();
      const adapter = makeAdapter(db);
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "T", createdById: "u1" });
      const root = await adapter.mutate!.createComment({
        subject: subjectA,
        threadId: thread.id,
        authorId: "u1",
        bodyMarkdown: "root",
      });
      await adapter.mutate!.createComment({
        subject: subjectA,
        threadId: thread.id,
        authorId: "u2",
        parentCommentId: root.id,
        bodyMarkdown: "reply",
      });
      const roots = await adapter.read!.listComments({
        subject: subjectA,
        threadId: thread.id,
        rootsOnly: true,
        limit: 10,
      });
      expect(roots.items).toHaveLength(1);
      const previews = await listReplyPreviewsByParents(db, subjectA, thread.id, [root.id], {
        limitPerParent: 5,
        statuses: ["published"],
      });
      expect(previews.get(root.id)).toHaveLength(1);
    });

    it("survives two adapter instances on the same database", async () => {
      const db = getDb();
      const a1 = makeAdapter(db);
      const a2 = makeAdapter(db);
      const thread = await a1.mutate!.createThread({ subject: subjectA, title: "Shared", createdById: "u1" });
      const seen = await a2.read!.getThread(subjectA, thread.id);
      expect(seen?.title).toBe("Shared");
    });

    it("rolls back comment + counter when transaction body fails", async () => {
      const adapter = makeAdapter(getDb());
      const thread = await adapter.mutate!.createThread({ subject: subjectA, title: "T", createdById: "u1" });
      await expect(
        adapter.transaction!.run(async (ctx) => {
          await ctx.mutate.createComment({
            subject: subjectA,
            threadId: thread.id,
            authorId: "u1",
            bodyMarkdown: "inside tx",
          });
          throw new Error("abort");
        }),
      ).rejects.toThrow("abort");
      const after = await adapter.read!.getThread(subjectA, thread.id);
      expect(after?.replyCount).toBe(0);
    });
  });
}

describe("kysely sqlite integration", () => {
  let db: Kysely<DiscussionsDatabase>;
  let destroy: () => Promise<void>;

  beforeAll(async () => {
    const h = await createSqliteDiscussionsDb();
    db = h.db;
    destroy = h.destroy;
  });

  afterAll(async () => {
    await destroy();
  });

  it("migrates up and down on sqlite", async () => {
    await rollbackDiscussionsSchema(db, "sqlite");
    await migrateDiscussionsSchema(db, "sqlite", "up");
    const thread = await makeAdapter(db).mutate!.createThread({
      subject: subjectA,
      title: "after remigrate",
      createdById: "u1",
    });
    expect(thread.id).toBeTruthy();
  });

  registerSharedIntegrationTests("sqlite", () => db);
});

describe.skipIf(!pgUrl)("kysely postgres integration", () => {
  const hookTimeout = 60_000;
  let db: Kysely<DiscussionsDatabase>;
  let destroy: () => Promise<void>;

  beforeAll(async () => {
    const h = await createPostgresDiscussionsDb(pgUrl!);
    db = h.db;
    destroy = h.destroy;
  }, hookTimeout);

  afterAll(async () => {
    await destroy();
  }, hookTimeout);

  it("migrates up and down on postgres", async () => {
    await rollbackDiscussionsSchema(db, "postgres");
    await migrateDiscussionsSchema(db, "postgres", "up");
  }, hookTimeout);

  registerSharedIntegrationTests("postgres", () => db);
});

describe("tenant_key none semantics", () => {
  it("stores empty tenant id with sentinel key", async () => {
    const { db, destroy } = await createSqliteDiscussionsDb();
    try {
      const adapter = makeAdapter(db);
      const subject = { tenantId: "", subjectType: "doc", subjectId: "d1" };
      const thread = await adapter.mutate!.createThread({ subject, title: "No tenant", createdById: "u1" });
      const row = await db
        .selectFrom("discussions_threads")
        .select(["tenant_key", "tenant_id"])
        .where("id", "=", thread.id)
        .executeTakeFirstOrThrow();
      expect(row.tenant_key).toBe("__tenant_none__");
      expect(row.tenant_id).toBe("");
      const loaded = await adapter.read!.getThread(subject, thread.id);
      expect(loaded?.subject.tenantId).toBe("");
    } finally {
      await destroy();
    }
  });
});
