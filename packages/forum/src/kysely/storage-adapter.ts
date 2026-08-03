import type { Kysely } from "kysely";
import { sql } from "kysely";
import type {
  CreateCategoryInput,
  CreatePostRecord,
  CreateReportInput,
  CreateThreadRecord,
  ForumStorageAdapter,
  ModerationListOptions,
  PostListOptions,
  ReportListOptions,
  ThreadListOptions,
} from "../types.js";
import { newId, nowUtc, offsetForPage } from "../utils.js";
import {
  boolToInt,
  rowToCategory,
  rowToModerationEvent,
  rowToPost,
  rowToReaction,
  rowToReadState,
  rowToReport,
  rowToSubscription,
  rowToTag,
  rowToThread,
} from "./mappers.js";
import type { ForumDatabase } from "./schema.js";
import { slugifyTag } from "../slug.js";

export function createKyselyForumStorage(db: Kysely<ForumDatabase>): ForumStorageAdapter {
  return {
    categories: createCategoryRepo(db),
    threads: createThreadRepo(db),
    posts: createPostRepo(db),
    tags: createTagRepo(db),
    reactions: createReactionRepo(db),
    subscriptions: createSubscriptionRepo(db),
    readStates: createReadStateRepo(db),
    reports: createReportRepo(db),
    moderation: createModerationRepo(db),
    transaction<T>(fn: () => Promise<T>): Promise<T> {
      return db.transaction().execute(fn);
    },
  };
}

function createCategoryRepo(db: Kysely<ForumDatabase>) {
  return {
    async create(input: CreateCategoryInput) {
      const ts = nowUtc();
      const row = {
        id: newId(),
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        sort_order: input.sortOrder ?? 0,
        thread_count: 0,
        post_count: 0,
        created_at: ts,
        updated_at: ts,
      };
      await db.insertInto("forum_categories").values(row).execute();
      return rowToCategory(row);
    },
    async list() {
      const rows = await db
        .selectFrom("forum_categories")
        .selectAll()
        .orderBy("sort_order asc")
        .orderBy("name asc")
        .execute();
      return rows.map(rowToCategory);
    },
    async findById(id: string) {
      const row = await db.selectFrom("forum_categories").selectAll().where("id", "=", id).executeTakeFirst();
      return row ? rowToCategory(row) : null;
    },
    async findBySlug(slug: string) {
      const row = await db.selectFrom("forum_categories").selectAll().where("slug", "=", slug).executeTakeFirst();
      return row ? rowToCategory(row) : null;
    },
  };
}

function createThreadRepo(db: Kysely<ForumDatabase>) {
  return {
    async create(input: CreateThreadRecord) {
      const row = {
        id: input.id,
        category_id: input.categoryId,
        author_id: input.authorId,
        title: input.title,
        slug: input.slug,
        status: input.status ?? "open",
        is_pinned: boolToInt(input.isPinned ?? false),
        view_count: 0,
        post_count: 0,
        last_post_id: null as string | null,
        last_post_at: null as string | null,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
        deleted_at: null as string | null,
      };
      await db.insertInto("forum_threads").values(row).execute();
      return rowToThread(row);
    },
    async update(id: string, patch: Partial<ReturnType<typeof rowToThread>>) {
      const updates: Record<string, unknown> = { updated_at: nowUtc() };
      if (patch.title !== undefined) updates.title = patch.title;
      if (patch.slug !== undefined) updates.slug = patch.slug;
      if (patch.status !== undefined) updates.status = patch.status;
      if (patch.isPinned !== undefined) updates.is_pinned = boolToInt(patch.isPinned);
      if (patch.categoryId !== undefined) updates.category_id = patch.categoryId;
      if (patch.postCount !== undefined) updates.post_count = patch.postCount;
      if (patch.lastPostId !== undefined) updates.last_post_id = patch.lastPostId;
      if (patch.lastPostAt !== undefined) updates.last_post_at = patch.lastPostAt;
      if (patch.deletedAt !== undefined) updates.deleted_at = patch.deletedAt;
      await db.updateTable("forum_threads").set(updates).where("id", "=", id).execute();
      const row = await db.selectFrom("forum_threads").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
      return rowToThread(row);
    },
    async findById(id: string) {
      const row = await db.selectFrom("forum_threads").selectAll().where("id", "=", id).executeTakeFirst();
      return row ? rowToThread(row) : null;
    },
    async findBySlug(slug: string) {
      const row = await db.selectFrom("forum_threads").selectAll().where("slug", "=", slug).executeTakeFirst();
      return row ? rowToThread(row) : null;
    },
    async listByCategory(categoryId: string, options: ThreadListOptions) {
      const pageSize = options.pageSize ?? 20;
      const offset = offsetForPage(options.page ?? 1, pageSize);
      let q = db
        .selectFrom("forum_threads")
        .selectAll()
        .where("category_id", "=", categoryId);
      if (!options.includeDeleted) q = q.where("deleted_at", "is", null);
      if (options.sort === "popular") {
        q = q.orderBy("view_count desc");
      } else {
        q = q.orderBy("is_pinned desc").orderBy("last_post_at desc");
      }
      const rows = await q.limit(pageSize).offset(offset).execute();
      return rows.map(rowToThread);
    },
    async countByCategory(categoryId: string) {
      const r = await db
        .selectFrom("forum_threads")
        .select(db.fn.count<number>("id").as("count"))
        .where("category_id", "=", categoryId)
        .where("deleted_at", "is", null)
        .executeTakeFirstOrThrow();
      return Number(r.count);
    },
    async softDelete(id: string, deletedAt: string) {
      await db.updateTable("forum_threads").set({ deleted_at: deletedAt, updated_at: deletedAt }).where("id", "=", id).execute();
    },
    async incrementViewCount(id: string) {
      await db
        .updateTable("forum_threads")
        .set({ view_count: sql`view_count + 1` })
        .where("id", "=", id)
        .execute();
    },
  };
}

function createPostRepo(db: Kysely<ForumDatabase>) {
  return {
    async create(input: CreatePostRecord) {
      const row = {
        id: input.id,
        thread_id: input.threadId,
        author_id: input.authorId,
        parent_post_id: input.parentPostId ?? null,
        content_markdown: input.contentMarkdown,
        content_html: input.contentHtml,
        revision: input.revision ?? 1,
        is_hidden: 0,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
        deleted_at: null as string | null,
      };
      await db.insertInto("forum_posts").values(row).execute();
      return rowToPost(row);
    },
    async update(id: string, patch: Partial<ReturnType<typeof rowToPost>>) {
      const updates: Record<string, unknown> = { updated_at: nowUtc() };
      if (patch.contentMarkdown !== undefined) updates.content_markdown = patch.contentMarkdown;
      if (patch.contentHtml !== undefined) updates.content_html = patch.contentHtml;
      if (patch.revision !== undefined) updates.revision = patch.revision;
      if (patch.isHidden !== undefined) updates.is_hidden = boolToInt(patch.isHidden);
      if (patch.deletedAt !== undefined) updates.deleted_at = patch.deletedAt;
      await db.updateTable("forum_posts").set(updates).where("id", "=", id).execute();
      const row = await db.selectFrom("forum_posts").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
      return rowToPost(row);
    },
    async findById(id: string) {
      const row = await db.selectFrom("forum_posts").selectAll().where("id", "=", id).executeTakeFirst();
      return row ? rowToPost(row) : null;
    },
    async listByThread(threadId: string, options: PostListOptions) {
      const pageSize = options.pageSize ?? 50;
      const offset = offsetForPage(options.page ?? 1, pageSize);
      let q = db.selectFrom("forum_posts").selectAll().where("thread_id", "=", threadId);
      if (!options.includeDeleted) q = q.where("deleted_at", "is", null);
      if (!options.includeHidden) q = q.where("is_hidden", "=", 0);
      const rows = await q.orderBy("created_at asc").limit(pageSize).offset(offset).execute();
      return rows.map(rowToPost);
    },
    async countByThread(threadId: string, includeDeleted = false) {
      let q = db
        .selectFrom("forum_posts")
        .select(db.fn.count<number>("id").as("count"))
        .where("thread_id", "=", threadId);
      if (!includeDeleted) q = q.where("deleted_at", "is", null);
      const r = await q.executeTakeFirstOrThrow();
      return Number(r.count);
    },
    async softDelete(id: string, deletedAt: string) {
      await db.updateTable("forum_posts").set({ deleted_at: deletedAt, updated_at: deletedAt }).where("id", "=", id).execute();
    },
    async saveRevision(revision: {
      postId: string;
      revision: number;
      contentMarkdown: string;
      contentHtml: string;
      editedById: string;
      createdAt: string;
    }) {
      await db
        .insertInto("forum_post_revisions")
        .values({
          id: newId(),
          post_id: revision.postId,
          revision: revision.revision,
          content_markdown: revision.contentMarkdown,
          content_html: revision.contentHtml,
          edited_by_id: revision.editedById,
          created_at: revision.createdAt,
        })
        .execute();
    },
  };
}

function createTagRepo(db: Kysely<ForumDatabase>) {
  return {
    async findOrCreate(names: string[]) {
      const tags = [];
      for (const name of names) {
        const slug = slugifyTag(name);
        let row = await db.selectFrom("forum_tags").selectAll().where("slug", "=", slug).executeTakeFirst();
        if (!row) {
          const ts = nowUtc();
          row = {
            id: newId(),
            slug,
            name: name.trim(),
            thread_count: 0,
            created_at: ts,
          };
          await db.insertInto("forum_tags").values(row).execute();
        }
        tags.push(rowToTag(row));
      }
      return tags;
    },
    async list() {
      const rows = await db.selectFrom("forum_tags").selectAll().orderBy("name asc").execute();
      return rows.map(rowToTag);
    },
    async findBySlug(slug: string) {
      const row = await db.selectFrom("forum_tags").selectAll().where("slug", "=", slug).executeTakeFirst();
      return row ? rowToTag(row) : null;
    },
    async attachToThread(threadId: string, tagIds: string[]) {
      for (const tagId of tagIds) {
        await db
          .insertInto("forum_thread_tags")
          .values({ thread_id: threadId, tag_id: tagId })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }
    },
    async listByThread(threadId: string) {
      const rows = await db
        .selectFrom("forum_tags")
        .innerJoin("forum_thread_tags", "forum_thread_tags.tag_id", "forum_tags.id")
        .selectAll("forum_tags")
        .where("forum_thread_tags.thread_id", "=", threadId)
        .execute();
      return rows.map(rowToTag);
    },
    async listThreadsByTag(tagId: string, options: ThreadListOptions) {
      const pageSize = options.pageSize ?? 20;
      const offset = offsetForPage(options.page ?? 1, pageSize);
      const rows = await db
        .selectFrom("forum_threads")
        .innerJoin("forum_thread_tags", "forum_thread_tags.thread_id", "forum_threads.id")
        .selectAll("forum_threads")
        .where("forum_thread_tags.tag_id", "=", tagId)
        .where("forum_threads.deleted_at", "is", null)
        .orderBy("forum_threads.last_post_at desc")
        .limit(pageSize)
        .offset(offset)
        .execute();
      return rows.map(rowToThread);
    },
  };
}

function createReactionRepo(db: Kysely<ForumDatabase>) {
  return {
    async upsert(postId: string, userId: string, emoji: string) {
      const existing = await db
        .selectFrom("forum_reactions")
        .selectAll()
        .where("post_id", "=", postId)
        .where("user_id", "=", userId)
        .where("emoji", "=", emoji)
        .executeTakeFirst();
      if (existing) return rowToReaction(existing);
      const row = { id: newId(), post_id: postId, user_id: userId, emoji, created_at: nowUtc() };
      await db.insertInto("forum_reactions").values(row).execute();
      return rowToReaction(row);
    },
    async remove(postId: string, userId: string, emoji: string) {
      await db
        .deleteFrom("forum_reactions")
        .where("post_id", "=", postId)
        .where("user_id", "=", userId)
        .where("emoji", "=", emoji)
        .execute();
    },
    async listByPost(postId: string) {
      const rows = await db.selectFrom("forum_reactions").selectAll().where("post_id", "=", postId).execute();
      return rows.map(rowToReaction);
    },
  };
}

function createSubscriptionRepo(db: Kysely<ForumDatabase>) {
  return {
    async subscribe(threadId: string, userId: string) {
      const existing = await db
        .selectFrom("forum_subscriptions")
        .selectAll()
        .where("thread_id", "=", threadId)
        .where("user_id", "=", userId)
        .executeTakeFirst();
      if (existing) return rowToSubscription(existing);
      const row = { id: newId(), thread_id: threadId, user_id: userId, created_at: nowUtc() };
      await db.insertInto("forum_subscriptions").values(row).execute();
      return rowToSubscription(row);
    },
    async unsubscribe(threadId: string, userId: string) {
      await db
        .deleteFrom("forum_subscriptions")
        .where("thread_id", "=", threadId)
        .where("user_id", "=", userId)
        .execute();
    },
    async isSubscribed(threadId: string, userId: string) {
      const row = await db
        .selectFrom("forum_subscriptions")
        .select("id")
        .where("thread_id", "=", threadId)
        .where("user_id", "=", userId)
        .executeTakeFirst();
      return Boolean(row);
    },
  };
}

function createReadStateRepo(db: Kysely<ForumDatabase>) {
  return {
    async upsert(threadId: string, userId: string, lastReadPostId: string | null) {
      const existing = await db
        .selectFrom("forum_read_states")
        .selectAll()
        .where("thread_id", "=", threadId)
        .where("user_id", "=", userId)
        .executeTakeFirst();
      const ts = nowUtc();
      if (existing) {
        await db
          .updateTable("forum_read_states")
          .set({ last_read_post_id: lastReadPostId, last_read_at: ts })
          .where("id", "=", existing.id)
          .execute();
        return rowToReadState({ ...existing, last_read_post_id: lastReadPostId, last_read_at: ts });
      }
      const row = {
        id: newId(),
        thread_id: threadId,
        user_id: userId,
        last_read_post_id: lastReadPostId,
        last_read_at: ts,
      };
      await db.insertInto("forum_read_states").values(row).execute();
      return rowToReadState(row);
    },
    async find(threadId: string, userId: string) {
      const row = await db
        .selectFrom("forum_read_states")
        .selectAll()
        .where("thread_id", "=", threadId)
        .where("user_id", "=", userId)
        .executeTakeFirst();
      return row ? rowToReadState(row) : null;
    },
  };
}

function createReportRepo(db: Kysely<ForumDatabase>) {
  return {
    async create(input: CreateReportInput) {
      const ts = nowUtc();
      const row = {
        id: newId(),
        reporter_id: input.reporterId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
        status: "open",
        reviewed_by_id: null as string | null,
        reviewed_at: null as string | null,
        created_at: ts,
        updated_at: ts,
      };
      await db.insertInto("forum_reports").values(row).execute();
      return rowToReport(row);
    },
    async update(id: string, patch: Partial<ReturnType<typeof rowToReport>>) {
      const updates: Record<string, unknown> = { updated_at: nowUtc() };
      if (patch.status !== undefined) updates.status = patch.status;
      if (patch.reviewedById !== undefined) updates.reviewed_by_id = patch.reviewedById;
      if (patch.reviewedAt !== undefined) updates.reviewed_at = patch.reviewedAt;
      await db.updateTable("forum_reports").set(updates).where("id", "=", id).execute();
      const row = await db.selectFrom("forum_reports").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
      return rowToReport(row);
    },
    async findById(id: string) {
      const row = await db.selectFrom("forum_reports").selectAll().where("id", "=", id).executeTakeFirst();
      return row ? rowToReport(row) : null;
    },
    async list(options: ReportListOptions) {
      const pageSize = options.pageSize ?? 20;
      const offset = offsetForPage(options.page ?? 1, pageSize);
      let q = db.selectFrom("forum_reports").selectAll();
      if (options.status) q = q.where("status", "=", options.status);
      const rows = await q.orderBy("created_at desc").limit(pageSize).offset(offset).execute();
      return rows.map(rowToReport);
    },
  };
}

function createModerationRepo(db: Kysely<ForumDatabase>) {
  return {
    async append(event: {
      actorId: string;
      action: string;
      targetType: "thread" | "post" | "report";
      targetId: string;
      reason?: string;
      metadata?: Record<string, unknown>;
      createdAt: string;
    }) {
      const row = {
        id: newId(),
        actor_id: event.actorId,
        action: event.action,
        target_type: event.targetType,
        target_id: event.targetId,
        reason: event.reason ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        created_at: event.createdAt,
      };
      await db.insertInto("forum_moderation_events").values(row).execute();
      return rowToModerationEvent(row);
    },
    async list(options: ModerationListOptions) {
      const pageSize = options.pageSize ?? 50;
      const offset = offsetForPage(options.page ?? 1, pageSize);
      let q = db.selectFrom("forum_moderation_events").selectAll();
      if (options.targetType) q = q.where("target_type", "=", options.targetType);
      if (options.targetId) q = q.where("target_id", "=", options.targetId);
      const rows = await q.orderBy("created_at desc").limit(pageSize).offset(offset).execute();
      return rows.map(rowToModerationEvent);
    },
  };
}

export { migrateForumSchema } from "./migrate.js";
