import { FORUM_PERMISSIONS, requireForumPermission } from "../permissions.js";
import { buildThreadSlug } from "../slug.js";
import type {
  CreateThreadInput,
  ForumMarkdownAdapter,
  ForumPermission,
  ForumStorageAdapter,
  ForumThread,
  MoveThreadInput,
  ThreadListOptions,
} from "../types.js";
import { newId, nowUtc } from "../utils.js";
import { renderPostContent } from "../markdown.js";

export interface ThreadServiceDeps {
  storage: ForumStorageAdapter;
  markdown: ForumMarkdownAdapter;
}

export class ThreadService {
  constructor(private readonly deps: ThreadServiceDeps) {}

  async create(
    input: CreateThreadInput,
    permissions: ForumPermission[],
  ): Promise<{ thread: ForumThread; firstPostId: string }> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_CREATE);
    const ts = nowUtc();
    const threadId = newId();
    const postId = newId();
    const slug = buildThreadSlug(threadId, input.title);
    const { html } = renderPostContent(input.contentMarkdown, this.deps.markdown);

    return this.deps.storage.transaction(async () => {
      const thread = await this.deps.storage.threads.create({
        id: threadId,
        categoryId: input.categoryId,
        authorId: input.authorId,
        title: input.title,
        slug,
        createdAt: ts,
        updatedAt: ts,
      });

      const post = await this.deps.storage.posts.create({
        id: postId,
        threadId,
        authorId: input.authorId,
        contentMarkdown: input.contentMarkdown,
        contentHtml: html,
        createdAt: ts,
        updatedAt: ts,
      });

      await this.deps.storage.threads.update(threadId, {
        postCount: 1,
        lastPostId: post.id,
        lastPostAt: ts,
      });

      if (input.tagNames?.length) {
        const tags = await this.deps.storage.tags.findOrCreate(input.tagNames);
        await this.deps.storage.tags.attachToThread(threadId, tags.map((t) => t.id));
      }

      const updated = await this.deps.storage.threads.findById(threadId);
      return { thread: updated!, firstPostId: post.id };
    });
  }

  async rename(
    threadId: string,
    title: string,
    actorId: string,
    permissions: ForumPermission[],
  ): Promise<ForumThread> {
    const thread = await this.deps.storage.threads.findById(threadId);
    if (!thread) throw new ForumNotFoundError("thread");
    const canUpdate =
      permissions.includes(FORUM_PERMISSIONS.THREAD_UPDATE_ANY) ||
      (thread.authorId === actorId && permissions.includes(FORUM_PERMISSIONS.THREAD_UPDATE_OWN));
    if (!canUpdate) requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_UPDATE_OWN);
    const slug = buildThreadSlug(threadId, title);
    return this.deps.storage.threads.update(threadId, { title, slug });
  }

  async close(threadId: string, permissions: ForumPermission[]): Promise<ForumThread> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_CLOSE);
    return this.deps.storage.threads.update(threadId, { status: "closed" });
  }

  async open(threadId: string, permissions: ForumPermission[]): Promise<ForumThread> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_CLOSE);
    return this.deps.storage.threads.update(threadId, { status: "open" });
  }

  async pin(threadId: string, pinned: boolean, permissions: ForumPermission[]): Promise<ForumThread> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_PIN);
    return this.deps.storage.threads.update(threadId, { isPinned: pinned });
  }

  async move(input: MoveThreadInput, permissions: ForumPermission[]): Promise<ForumThread> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_MOVE);
    return this.deps.storage.transaction(async () => {
      return this.deps.storage.threads.update(input.threadId, { categoryId: input.categoryId });
    });
  }

  async softDelete(threadId: string, permissions: ForumPermission[]): Promise<void> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.THREAD_UPDATE_ANY);
    await this.deps.storage.threads.softDelete(threadId, nowUtc());
  }

  async findBySlug(slug: string): Promise<ForumThread | null> {
    return this.deps.storage.threads.findBySlug(slug);
  }

  async findById(id: string): Promise<ForumThread | null> {
    return this.deps.storage.threads.findById(id);
  }

  async listByCategory(categoryId: string, options: ThreadListOptions): Promise<ForumThread[]> {
    return this.deps.storage.threads.listByCategory(categoryId, options);
  }

  async incrementViews(threadId: string): Promise<void> {
    await this.deps.storage.threads.incrementViewCount(threadId);
  }
}

export class ForumNotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "ForumNotFoundError";
  }
}
