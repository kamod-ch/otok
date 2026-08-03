import {
  FORUM_PERMISSIONS,
  canDeletePost,
  canEditPost,
  requireForumPermission,
} from "../permissions.js";
import { renderPostContent } from "../markdown.js";
import type {
  CreatePostInput,
  EditPostInput,
  ForumMarkdownAdapter,
  ForumPermission,
  ForumPost,
  ForumStorageAdapter,
  PostListOptions,
} from "../types.js";
import { newId, nowUtc } from "../utils.js";
import { ForumNotFoundError } from "./threads.js";

export interface PostServiceDeps {
  storage: ForumStorageAdapter;
  markdown: ForumMarkdownAdapter;
}

export class PostService {
  constructor(private readonly deps: PostServiceDeps) {}

  async create(input: CreatePostInput, permissions: ForumPermission[]): Promise<ForumPost> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.POST_CREATE);
    const thread = await this.deps.storage.threads.findById(input.threadId);
    if (!thread || thread.deletedAt) throw new ForumNotFoundError("thread");
    if (thread.status === "closed") {
      throw new ForumClosedThreadError();
    }

    const ts = nowUtc();
    const postId = newId();
    const { html } = renderPostContent(input.contentMarkdown, this.deps.markdown);

    return this.deps.storage.transaction(async () => {
      const post = await this.deps.storage.posts.create({
        id: postId,
        threadId: input.threadId,
        authorId: input.authorId,
        parentPostId: input.parentPostId ?? null,
        contentMarkdown: input.contentMarkdown,
        contentHtml: html,
        createdAt: ts,
        updatedAt: ts,
      });

      const count = await this.deps.storage.posts.countByThread(input.threadId);
      await this.deps.storage.threads.update(input.threadId, {
        postCount: count,
        lastPostId: post.id,
        lastPostAt: ts,
      });

      return post;
    });
  }

  async edit(input: EditPostInput, permissions: ForumPermission[]): Promise<ForumPost> {
    const post = await this.deps.storage.posts.findById(input.postId);
    if (!post || post.deletedAt) throw new ForumNotFoundError("post");
    if (!canEditPost(permissions, { id: input.editorId, displayName: "", roles: [] }, post.authorId)) {
      requireForumPermission(permissions, FORUM_PERMISSIONS.POST_UPDATE_OWN);
    }

    const { html } = renderPostContent(input.contentMarkdown, this.deps.markdown);
    const ts = nowUtc();
    const revision = post.revision + 1;

    return this.deps.storage.transaction(async () => {
      await this.deps.storage.posts.saveRevision({
        postId: post.id,
        revision: post.revision,
        contentMarkdown: post.contentMarkdown,
        contentHtml: post.contentHtml,
        editedById: input.editorId,
        createdAt: ts,
      });

      return this.deps.storage.posts.update(post.id, {
        contentMarkdown: input.contentMarkdown,
        contentHtml: html,
        revision,
      });
    });
  }

  async softDelete(postId: string, actorId: string, permissions: ForumPermission[]): Promise<void> {
    const post = await this.deps.storage.posts.findById(postId);
    if (!post) throw new ForumNotFoundError("post");
    if (!canDeletePost(permissions, { id: actorId, displayName: "", roles: [] }, post.authorId)) {
      requireForumPermission(permissions, FORUM_PERMISSIONS.POST_DELETE_OWN);
    }

    const ts = nowUtc();
    await this.deps.storage.transaction(async () => {
      await this.deps.storage.posts.softDelete(postId, ts);
      const count = await this.deps.storage.posts.countByThread(post.threadId);
      await this.deps.storage.threads.update(post.threadId, { postCount: count });
    });
  }

  async quote(postId: string): Promise<{ markdown: string; post: ForumPost }> {
    const post = await this.deps.storage.posts.findById(postId);
    if (!post) throw new ForumNotFoundError("post");
    const excerpt = post.contentMarkdown.split("\n").slice(0, 3).join("\n");
    const markdown = `> ${excerpt.replace(/\n/g, "\n> ")}\n\n`;
    return { markdown, post };
  }

  async listByThread(threadId: string, options: PostListOptions = {}): Promise<ForumPost[]> {
    return this.deps.storage.posts.listByThread(threadId, options);
  }

  async findById(id: string): Promise<ForumPost | null> {
    return this.deps.storage.posts.findById(id);
  }
}

export class ForumClosedThreadError extends Error {
  readonly code = "THREAD_CLOSED";
  constructor() {
    super("Thread is closed");
    this.name = "ForumClosedThreadError";
  }
}
