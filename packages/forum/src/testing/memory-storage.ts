import type {
  CreateCategoryInput,
  CreatePostRecord,
  CreateReportInput,
  CreateThreadRecord,
  ForumCategory,
  ForumModerationEvent,
  ForumPost,
  ForumPostRevision,
  ForumReaction,
  ForumReadState,
  ForumReport,
  ForumStorageAdapter,
  ForumSubscription,
  ForumTag,
  ForumThread,
  ModerationListOptions,
  PostListOptions,
  ReportListOptions,
  ThreadListOptions,
} from "../types.js";
import { newId, nowUtc, offsetForPage } from "../utils.js";
import { slugifyTag } from "../slug.js";

/** In-memory storage for unit/integration tests — no native SQLite required. */
export function createMemoryForumStorage(): ForumStorageAdapter {
  const categories = new Map<string, ForumCategory>();
  const threads = new Map<string, ForumThread>();
  const posts = new Map<string, ForumPost>();
  const tags = new Map<string, ForumTag>();
  const threadTags = new Map<string, Set<string>>();
  const reactions = new Map<string, ForumReaction>();
  const subscriptions = new Map<string, ForumSubscription>();
  const readStates = new Map<string, ForumReadState>();
  const reports = new Map<string, ForumReport>();
  const moderationEvents: ForumModerationEvent[] = [];
  const revisions: ForumPostRevision[] = [];

  return {
    transaction(fn) {
      return fn();
    },
    categories: {
      async create(input: CreateCategoryInput) {
        const ts = nowUtc();
        const cat: ForumCategory = {
          id: newId(),
          slug: input.slug,
          name: input.name,
          description: input.description,
          sortOrder: input.sortOrder ?? 0,
          threadCount: 0,
          postCount: 0,
          createdAt: ts,
          updatedAt: ts,
        };
        categories.set(cat.id, cat);
        return cat;
      },
      async list() {
        return [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      },
      async findById(id) {
        return categories.get(id) ?? null;
      },
      async findBySlug(slug) {
        return [...categories.values()].find((c) => c.slug === slug) ?? null;
      },
    },
    threads: {
      async create(input: CreateThreadRecord) {
        const thread: ForumThread = {
          id: input.id,
          categoryId: input.categoryId,
          authorId: input.authorId,
          title: input.title,
          slug: input.slug,
          status: input.status ?? "open",
          isPinned: input.isPinned ?? false,
          viewCount: 0,
          postCount: 0,
          lastPostId: null,
          lastPostAt: null,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
          deletedAt: null,
        };
        threads.set(thread.id, thread);
        return thread;
      },
      async update(id, patch) {
        const t = threads.get(id);
        if (!t) throw new Error("thread not found");
        const updated = { ...t, ...patch, updatedAt: nowUtc() };
        threads.set(id, updated);
        return updated;
      },
      async findById(id) {
        return threads.get(id) ?? null;
      },
      async findBySlug(slug) {
        return [...threads.values()].find((t) => t.slug === slug) ?? null;
      },
      async listByCategory(categoryId, options: ThreadListOptions) {
        const pageSize = options.pageSize ?? 20;
        const offset = offsetForPage(options.page ?? 1, pageSize);
        return [...threads.values()]
          .filter((t) => t.categoryId === categoryId && (options.includeDeleted || !t.deletedAt))
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.lastPostAt ?? "").localeCompare(a.lastPostAt ?? ""))
          .slice(offset, offset + pageSize);
      },
      async countByCategory(categoryId) {
        return [...threads.values()].filter((t) => t.categoryId === categoryId && !t.deletedAt).length;
      },
      async softDelete(id, deletedAt) {
        const t = threads.get(id);
        if (t) threads.set(id, { ...t, deletedAt, updatedAt: deletedAt });
      },
      async incrementViewCount(id) {
        const t = threads.get(id);
        if (t) threads.set(id, { ...t, viewCount: t.viewCount + 1 });
      },
    },
    posts: {
      async create(input: CreatePostRecord) {
        const post: ForumPost = {
          id: input.id,
          threadId: input.threadId,
          authorId: input.authorId,
          parentPostId: input.parentPostId ?? null,
          contentMarkdown: input.contentMarkdown,
          contentHtml: input.contentHtml,
          revision: input.revision ?? 1,
          isHidden: false,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
          deletedAt: null,
        };
        posts.set(post.id, post);
        return post;
      },
      async update(id, patch) {
        const p = posts.get(id);
        if (!p) throw new Error("post not found");
        const updated = { ...p, ...patch, updatedAt: nowUtc() };
        posts.set(id, updated);
        return updated;
      },
      async findById(id) {
        return posts.get(id) ?? null;
      },
      async listByThread(threadId, options: PostListOptions) {
        return [...posts.values()]
          .filter((p) => p.threadId === threadId && (options.includeDeleted || !p.deletedAt) && (options.includeHidden || !p.isHidden))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async countByThread(threadId, includeDeleted = false) {
        return [...posts.values()].filter((p) => p.threadId === threadId && (includeDeleted || !p.deletedAt)).length;
      },
      async softDelete(id, deletedAt) {
        const p = posts.get(id);
        if (p) posts.set(id, { ...p, deletedAt, updatedAt: deletedAt });
      },
      async saveRevision(revision) {
        revisions.push({ id: newId(), ...revision });
      },
    },
    tags: {
      async findOrCreate(names) {
        const result: ForumTag[] = [];
        for (const name of names) {
          const slug = slugifyTag(name);
          let tag = [...tags.values()].find((t) => t.slug === slug);
          if (!tag) {
            tag = { id: newId(), slug, name, threadCount: 0, createdAt: nowUtc() };
            tags.set(tag.id, tag);
          }
          result.push(tag);
        }
        return result;
      },
      async list() {
        return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name));
      },
      async findBySlug(slug) {
        return [...tags.values()].find((t) => t.slug === slug) ?? null;
      },
      async attachToThread(threadId, tagIds) {
        const set = threadTags.get(threadId) ?? new Set();
        for (const id of tagIds) set.add(id);
        threadTags.set(threadId, set);
      },
      async listByThread(threadId) {
        const ids = threadTags.get(threadId) ?? new Set();
        return [...ids].map((id) => tags.get(id)!).filter(Boolean);
      },
      async listThreadsByTag(tagId, options) {
        const threadIds = [...threadTags.entries()].filter(([, ids]) => ids.has(tagId)).map(([id]) => id);
        return threadIds
          .map((id) => threads.get(id)!)
          .filter((t) => t && !t.deletedAt)
          .slice(0, options.pageSize ?? 20);
      },
    },
    reactions: {
      async upsert(postId, userId, emoji) {
        const key = `${postId}:${userId}:${emoji}`;
        const existing = [...reactions.values()].find((r) => `${r.postId}:${r.userId}:${r.emoji}` === key);
        if (existing) return existing;
        const r = { id: newId(), postId, userId, emoji, createdAt: nowUtc() };
        reactions.set(r.id, r);
        return r;
      },
      async remove(postId, userId, emoji) {
        for (const [id, r] of reactions) {
          if (r.postId === postId && r.userId === userId && r.emoji === emoji) reactions.delete(id);
        }
      },
      async listByPost(postId) {
        return [...reactions.values()].filter((r) => r.postId === postId);
      },
    },
    subscriptions: {
      async subscribe(threadId, userId) {
        const key = `${threadId}:${userId}`;
        const existing = [...subscriptions.values()].find((s) => `${s.threadId}:${s.userId}` === key);
        if (existing) return existing;
        const s = { id: newId(), threadId, userId, createdAt: nowUtc() };
        subscriptions.set(s.id, s);
        return s;
      },
      async unsubscribe(threadId, userId) {
        for (const [id, s] of subscriptions) {
          if (s.threadId === threadId && s.userId === userId) subscriptions.delete(id);
        }
      },
      async isSubscribed(threadId, userId) {
        return [...subscriptions.values()].some((s) => s.threadId === threadId && s.userId === userId);
      },
    },
    readStates: {
      async upsert(threadId, userId, lastReadPostId) {
        const key = `${threadId}:${userId}`;
        const existing = [...readStates.values()].find((s) => `${s.threadId}:${s.userId}` === key);
        const ts = nowUtc();
        if (existing) {
          const updated = { ...existing, lastReadPostId, lastReadAt: ts };
          readStates.set(existing.id, updated);
          return updated;
        }
        const s = { id: newId(), threadId, userId, lastReadPostId, lastReadAt: ts };
        readStates.set(s.id, s);
        return s;
      },
      async find(threadId, userId) {
        return [...readStates.values()].find((s) => s.threadId === threadId && s.userId === userId) ?? null;
      },
    },
    reports: {
      async create(input: CreateReportInput) {
        const ts = nowUtc();
        const r: ForumReport = {
          id: newId(),
          reporterId: input.reporterId,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          details: input.details,
          status: "open",
          reviewedById: null,
          reviewedAt: null,
          createdAt: ts,
          updatedAt: ts,
        };
        reports.set(r.id, r);
        return r;
      },
      async update(id, patch) {
        const r = reports.get(id);
        if (!r) throw new Error("report not found");
        const updated = { ...r, ...patch, updatedAt: nowUtc() };
        reports.set(id, updated);
        return updated;
      },
      async findById(id) {
        return reports.get(id) ?? null;
      },
      async list(options: ReportListOptions) {
        return [...reports.values()]
          .filter((r) => !options.status || r.status === options.status)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
    },
    moderation: {
      async append(event) {
        const e: ForumModerationEvent = { id: newId(), ...event };
        moderationEvents.push(e);
        return e;
      },
      async list(options: ModerationListOptions) {
        return moderationEvents
          .filter((e) => !options.targetType || e.targetType === options.targetType)
          .filter((e) => !options.targetId || e.targetId === options.targetId)
          .slice(0, options.pageSize ?? 50);
      },
    },
  };
}
