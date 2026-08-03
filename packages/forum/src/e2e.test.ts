import { describe, expect, it, beforeEach } from "vitest";
import { createOtokTestApp, expectRedirect, expectValidationDocument } from "@otok/test";
import {
  createTestAuthAdapter,
  createTestStorage,
  createTestUser,
  seedTestCategory,
  seedTestThread,
} from "./testing/index.js";
import { createForum } from "./index.js";
import { permissionsForUser } from "./permissions.js";
import type { ForumUser } from "../types.js";

describe("forum e2e", () => {
  let storage: ReturnType<typeof createTestStorage>;
  let users: Record<string, ForumUser>;
  let auth: ReturnType<typeof createTestAuthAdapter> & { setUser(id: string | null): void };

  beforeEach(async () => {
    storage = createTestStorage();
    const member = createTestUser({ id: "member-1", displayName: "Member", roles: ["member"] });
    const moderator = createTestUser({ id: "mod-1", displayName: "Moderator", roles: ["moderator"] });
    users = { [member.id]: member, [moderator.id]: moderator };
    auth = createTestAuthAdapter(users) as typeof auth;
  });

  async function createApp() {
    const forum = createForum({
      basePath: "/community",
      storage,
      auth,
      locale: "en",
    });
    return createOtokTestApp({ routes: forum.routes });
  }

  it("renders category list", async () => {
    await seedTestCategory(storage, { name: "Otok Framework", slug: "otok" });
    const app = await createApp();
    const res = await app.get("/community");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Otok Framework");
    await app.cleanup();
  });

  it("creates thread without javascript", async () => {
    const cat = await seedTestCategory(storage);
    auth.setUser("member-1");
    const app = await createApp();
    const res = await app.post("/community/new", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        intent: "create-thread",
        categoryId: cat.id,
        title: "My First Thread",
        content: "Hello from form post",
        tags: "otok,demo",
      }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/\/community\/t\//);
    await app.cleanup();
  });

  it("creates reply without javascript", async () => {
    const cat = await seedTestCategory(storage);
    const user = users["member-1"]!;
    const { thread } = await seedTestThread(storage, cat.id, user.id);
    auth.setUser("member-1");
    const app = await createApp();
    const res = await app.post(`/community/t/${thread.slug}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ intent: "reply", content: "Reply content here" }),
    });
    expectRedirect(res, { location: `/community/t/${thread.slug}`, status: 303 });
    await app.cleanup();
  });

  it("shows validation error on empty title", async () => {
    const cat = await seedTestCategory(storage);
    auth.setUser("member-1");
    const app = await createApp();
    const res = await app.post("/community/new", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ intent: "create-thread", categoryId: cat.id, title: "ab", content: "x" }),
    });
    expectValidationDocument(res);
    await app.cleanup();
  });

  it("closes thread as moderator", async () => {
    const cat = await seedTestCategory(storage);
    const { thread } = await seedTestThread(storage, cat.id, "member-1");
    auth.setUser("mod-1");
    const app = await createApp();
    const res = await app.post(`/community/t/${thread.slug}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ intent: "close" }),
    });
    expect(res.status).toBe(303);
    await app.cleanup();
  });

  it("rejects reply on closed thread", async () => {
    const cat = await seedTestCategory(storage);
    const { thread } = await seedTestThread(storage, cat.id, "member-1");
    await storage.threads.update(thread.id, { status: "closed" });
    auth.setUser("member-1");
    const app = await createApp();
    const res = await app.post(`/community/t/${thread.slug}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ intent: "reply", content: "Should fail" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    await app.cleanup();
  });

  it("reports a post", async () => {
    const cat = await seedTestCategory(storage);
    const { post } = await seedTestThread(storage, cat.id, "member-1");
    auth.setUser("member-1");
    const app = await createApp();
    const res = await app.post("/community/report", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        intent: "report",
        targetType: "post",
        targetId: post.id,
        reason: "spam",
      }),
    });
    expectRedirect(res, { location: "/community/moderation", status: 303 });
    await app.cleanup();
  });

  it("rejects unauthorized moderation", async () => {
    auth.setUser("member-1");
    const app = await createApp();
    const res = await app.get("/community/moderation");
    expect(res.status).toBe(403);
    await app.cleanup();
  });

  it("redirects non-canonical slug", async () => {
    const cat = await seedTestCategory(storage);
    const { thread } = await seedTestThread(storage, cat.id, "member-1", "Canonical Title");
    const app = await createApp();
    const wrongSlug = `${thread.id}--old-title`;
    const res = await app.get(`/community/t/${wrongSlug}`, { redirect: "manual" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain(thread.slug);
    await app.cleanup();
  });
});
