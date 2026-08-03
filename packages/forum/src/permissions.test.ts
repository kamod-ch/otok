import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROLE_PERMISSIONS,
  FORUM_PERMISSIONS,
  canEditPost,
  canEditThread,
  hasForumPermission,
  permissionsForRole,
  permissionsForUser,
  requireForumPermission,
  ForumPermissionError,
} from "./permissions.js";

describe("forum permissions", () => {
  it("guest can only view categories", () => {
    expect(permissionsForRole("guest")).toEqual([FORUM_PERMISSIONS.CATEGORY_VIEW]);
  });

  it("member can create threads and posts", () => {
    const perms = permissionsForRole("member");
    expect(perms).toContain(FORUM_PERMISSIONS.THREAD_CREATE);
    expect(perms).toContain(FORUM_PERMISSIONS.POST_CREATE);
    expect(perms).not.toContain(FORUM_PERMISSIONS.MODERATION_VIEW);
  });

  it("moderator has moderation permissions", () => {
    const perms = permissionsForRole("moderator");
    expect(perms).toContain(FORUM_PERMISSIONS.MODERATION_VIEW);
    expect(perms).toContain(FORUM_PERMISSIONS.REPORT_REVIEW);
  });

  it("admin has all permissions", () => {
    expect(permissionsForRole("admin")).toEqual(Object.values(FORUM_PERMISSIONS));
  });

  it("resolves permissions from user roles", () => {
    const user = { id: "1", displayName: "Mod", roles: ["moderator"] };
    expect(permissionsForUser(user)).toContain(FORUM_PERMISSIONS.THREAD_CLOSE);
  });

  it("requireForumPermission throws when missing", () => {
    expect(() => requireForumPermission([], FORUM_PERMISSIONS.POST_CREATE)).toThrow(ForumPermissionError);
  });

  it("canEditThread respects ownership", () => {
    const user = { id: "a", displayName: "A", roles: ["member"] };
    expect(canEditThread(permissionsForUser(user), user, "a")).toBe(true);
    expect(canEditThread(permissionsForUser(user), user, "b")).toBe(false);
  });

  it("canEditPost respects any permission", () => {
    const mod = { id: "m", displayName: "M", roles: ["moderator"] };
    expect(canEditPost(permissionsForUser(mod), mod, "other")).toBe(true);
  });

  it("hasForumPermission checks exact permission", () => {
    expect(hasForumPermission(DEFAULT_ROLE_PERMISSIONS.member, FORUM_PERMISSIONS.POST_CREATE)).toBe(true);
  });
});
