import { createForum, type CreateForumOptions } from "../index.js";
import type { ForumAuthAdapter, ForumStorageAdapter, ForumUser } from "../types.js";
import { permissionsForUser } from "../permissions.js";
import { newId, nowUtc } from "../utils.js";
import type { ForumCategory, ForumPost, ForumThread } from "../types.js";
import { createMemoryForumStorage } from "./memory-storage.js";

export async function createTestDatabase(): Promise<never> {
  throw new Error("Use createMemoryForumStorage() or createTestStorage() instead of createTestDatabase() when better-sqlite3 is unavailable");
}

export function createTestStorage(_db?: unknown): ForumStorageAdapter {
  return createMemoryForumStorage();
}

export function createTestAuthAdapter(users: Record<string, ForumUser> = {}): ForumAuthAdapter {
  let currentUserId: string | null = null;
  return {
    async getCurrentUser() {
      if (!currentUserId) return null;
      return users[currentUserId] ?? null;
    },
    /** @internal test helper */
    setUser(id: string | null) {
      currentUserId = id;
    },
  } as ForumAuthAdapter & { setUser(id: string | null): void };
}

export function createTestUser(overrides: Partial<ForumUser> = {}): ForumUser {
  return {
    id: overrides.id ?? newId(),
    displayName: overrides.displayName ?? "Test User",
    avatarUrl: overrides.avatarUrl,
    roles: overrides.roles ?? ["member"],
  };
}

export function createTestCategoryInput(overrides: Partial<{ slug: string; name: string }> = {}) {
  return {
    slug: overrides.slug ?? `cat-${newId().slice(0, 8)}`,
    name: overrides.name ?? "Test Category",
  };
}

export async function seedTestCategory(storage: ForumStorageAdapter, overrides = {}) {
  return storage.categories.create(createTestCategoryInput(overrides));
}

export async function seedTestThread(
  storage: ForumStorageAdapter,
  categoryId: string,
  authorId: string,
  title = "Test Thread",
): Promise<{ thread: ForumThread; post: ForumPost }> {
  const ts = nowUtc();
  const threadId = newId();
  const postId = newId();
  const slug = `${threadId}--${title.toLowerCase().replace(/\s+/g, "-")}`;
  const thread = await storage.threads.create({
    id: threadId,
    categoryId,
    authorId,
    title,
    slug,
    createdAt: ts,
    updatedAt: ts,
  });
  const post = await storage.posts.create({
    id: postId,
    threadId,
    authorId,
    contentMarkdown: "Hello world",
    contentHtml: "<p>Hello world</p>",
    createdAt: ts,
    updatedAt: ts,
  });
  await storage.threads.update(threadId, { postCount: 1, lastPostId: postId, lastPostAt: ts });
  return { thread: (await storage.threads.findById(threadId))!, post };
}

export function createTestForum(options: Omit<CreateForumOptions, "storage" | "auth"> & {
  storage?: ForumStorageAdapter;
  auth?: ForumAuthAdapter;
}) {
  const storage = options.storage ?? createMemoryForumStorage();
  const auth = options.auth ?? createTestAuthAdapter();
  return createForum({ ...options, storage, auth });
}

export { permissionsForUser, createTestUser as userFactory };
export { createMemoryForumStorage } from "./memory-storage.js";
