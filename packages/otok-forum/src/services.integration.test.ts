import { describe, expect, it, beforeEach } from "vitest";
import {
  createTestStorage,
  createTestUser,
  seedTestCategory,
  seedTestThread,
} from "./testing/index.js";
import { createForumServices } from "./services/index.js";
import { FORUM_PERMISSIONS } from "./permissions.js";
import { permissionsForUser } from "./permissions.js";

describe("forum services integration", () => {
  let storage: ReturnType<typeof createTestStorage>;

  beforeEach(async () => {
    storage = createTestStorage();
  });

  it("creates thread with first post in transaction", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage);
    const user = createTestUser();
    const perms = permissionsForUser(user);
    const { thread, firstPostId } = await services.threads.create(
      { categoryId: cat.id, title: "Integration Test", contentMarkdown: "First post", authorId: user.id },
      perms,
    );
    expect(thread.postCount).toBe(1);
    expect(firstPostId).toBeTruthy();
    const posts = await services.posts.listByThread(thread.id);
    expect(posts).toHaveLength(1);
  });

  it("updates post counts on reply", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage);
    const user = createTestUser();
    const perms = permissionsForUser(user);
    const { thread } = await services.threads.create(
      { categoryId: cat.id, title: "Reply Test", contentMarkdown: "First", authorId: user.id },
      perms,
    );
    await services.posts.create({ threadId: thread.id, contentMarkdown: "Second", authorId: user.id }, perms);
    const updated = await services.threads.findById(thread.id);
    expect(updated?.postCount).toBe(2);
  });

  it("soft deletes posts and updates counts", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage);
    const user = createTestUser();
    const { thread, post } = await seedTestThread(storage, cat.id, user.id);
    const perms = [...permissionsForUser(user), FORUM_PERMISSIONS.POST_DELETE_OWN];
    await services.posts.softDelete(post.id, user.id, perms);
    const count = await storage.posts.countByThread(thread.id);
    expect(count).toBe(0);
  });

  it("closes thread and rejects replies", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage);
    const user = createTestUser({ roles: ["moderator"] });
    const { thread } = await seedTestThread(storage, cat.id, user.id);
    const modPerms = permissionsForUser(user);
    await services.threads.close(thread.id, modPerms);
    await expect(
      services.posts.create({ threadId: thread.id, contentMarkdown: "nope", authorId: user.id }, modPerms),
    ).rejects.toThrow();
  });

  it("tracks read states", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage);
    const user = createTestUser();
    const { thread, post } = await seedTestThread(storage, cat.id, user.id);
    const perms = permissionsForUser(user);
    const state = await services.readStates.markRead(thread.id, user.id, post.id, perms);
    expect(state.lastReadPostId).toBe(post.id);
  });

  it("creates and reviews reports", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage);
    const user = createTestUser();
    const mod = createTestUser({ roles: ["moderator"] });
    const { post } = await seedTestThread(storage, cat.id, user.id);
    const report = await services.reports.create(
      { reporterId: user.id, targetType: "post", targetId: post.id, reason: "spam" },
      permissionsForUser(user),
    );
    expect(report.status).toBe("open");
    const reviewed = await services.reports.review(report.id, "resolved", mod.id, permissionsForUser(mod));
    expect(reviewed.status).toBe("resolved");
  });

  it("search respects permissions", async () => {
    const services = createForumServices(storage);
    const cat = await seedTestCategory(storage, { name: "Otok Framework" });
    await seedTestThread(storage, cat.id, createTestUser().id, "Otok discussion");
    const result = await services.search.search(
      { q: "Otok" },
      { user: null, permissions: [FORUM_PERMISSIONS.CATEGORY_VIEW], basePath: "/community" },
    );
    expect(result.hits.length).toBeGreaterThan(0);
  });
});
