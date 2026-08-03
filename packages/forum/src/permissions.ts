import type { ForumPermission, ForumRole, ForumUser } from "./types.js";

export const FORUM_PERMISSIONS = {
  CATEGORY_VIEW: "category:view",
  THREAD_CREATE: "thread:create",
  THREAD_UPDATE_OWN: "thread:update-own",
  THREAD_UPDATE_ANY: "thread:update-any",
  THREAD_CLOSE: "thread:close",
  THREAD_PIN: "thread:pin",
  THREAD_MOVE: "thread:move",
  POST_CREATE: "post:create",
  POST_UPDATE_OWN: "post:update-own",
  POST_UPDATE_ANY: "post:update-any",
  POST_DELETE_OWN: "post:delete-own",
  POST_DELETE_ANY: "post:delete-any",
  REPORT_CREATE: "report:create",
  REPORT_REVIEW: "report:review",
  MODERATION_VIEW: "moderation:view",
} as const satisfies Record<string, ForumPermission>;

/** Default role → permission mapping */
export const DEFAULT_ROLE_PERMISSIONS: Record<ForumRole, ForumPermission[]> = {
  guest: [FORUM_PERMISSIONS.CATEGORY_VIEW],
  member: [
    FORUM_PERMISSIONS.CATEGORY_VIEW,
    FORUM_PERMISSIONS.THREAD_CREATE,
    FORUM_PERMISSIONS.THREAD_UPDATE_OWN,
    FORUM_PERMISSIONS.POST_CREATE,
    FORUM_PERMISSIONS.POST_UPDATE_OWN,
    FORUM_PERMISSIONS.POST_DELETE_OWN,
    FORUM_PERMISSIONS.REPORT_CREATE,
  ],
  moderator: [
    FORUM_PERMISSIONS.CATEGORY_VIEW,
    FORUM_PERMISSIONS.THREAD_CREATE,
    FORUM_PERMISSIONS.THREAD_UPDATE_OWN,
    FORUM_PERMISSIONS.THREAD_UPDATE_ANY,
    FORUM_PERMISSIONS.THREAD_CLOSE,
    FORUM_PERMISSIONS.THREAD_PIN,
    FORUM_PERMISSIONS.THREAD_MOVE,
    FORUM_PERMISSIONS.POST_CREATE,
    FORUM_PERMISSIONS.POST_UPDATE_OWN,
    FORUM_PERMISSIONS.POST_UPDATE_ANY,
    FORUM_PERMISSIONS.POST_DELETE_OWN,
    FORUM_PERMISSIONS.POST_DELETE_ANY,
    FORUM_PERMISSIONS.REPORT_CREATE,
    FORUM_PERMISSIONS.REPORT_REVIEW,
    FORUM_PERMISSIONS.MODERATION_VIEW,
  ],
  admin: Object.values(FORUM_PERMISSIONS),
};

export function resolveRoleFromUser(user: ForumUser | null): ForumRole {
  if (!user) return "guest";
  if (user.roles.includes("admin")) return "admin";
  if (user.roles.includes("moderator")) return "moderator";
  if (user.roles.includes("member") || user.roles.length > 0) return "member";
  return "guest";
}

export function permissionsForRole(role: ForumRole): ForumPermission[] {
  return DEFAULT_ROLE_PERMISSIONS[role];
}

export function permissionsForUser(user: ForumUser | null): ForumPermission[] {
  if (!user) return permissionsForRole("guest");
  const granted = new Set<ForumPermission>();
  for (const role of ["admin", "moderator", "member"] as ForumRole[]) {
    if (user.roles.includes(role)) {
      for (const p of permissionsForRole(role)) granted.add(p);
    }
  }
  if (granted.size === 0) {
    for (const p of permissionsForRole("member")) granted.add(p);
  }
  return [...granted];
}

export function hasForumPermission(
  granted: readonly ForumPermission[],
  required: ForumPermission,
): boolean {
  return granted.includes(required);
}

export function requireForumPermission(
  granted: readonly ForumPermission[],
  required: ForumPermission,
): void {
  if (!hasForumPermission(granted, required)) {
    throw new ForumPermissionError(required);
  }
}

export class ForumPermissionError extends Error {
  readonly code = "FORBIDDEN";
  readonly permission: ForumPermission;

  constructor(permission: ForumPermission) {
    super(`Missing forum permission: ${permission}`);
    this.name = "ForumPermissionError";
    this.permission = permission;
  }
}

export function canEditThread(
  permissions: readonly ForumPermission[],
  user: ForumUser | null,
  authorId: string,
): boolean {
  if (hasForumPermission(permissions, FORUM_PERMISSIONS.THREAD_UPDATE_ANY)) return true;
  if (!user) return false;
  return user.id === authorId && hasForumPermission(permissions, FORUM_PERMISSIONS.THREAD_UPDATE_OWN);
}

export function canEditPost(
  permissions: readonly ForumPermission[],
  user: ForumUser | null,
  authorId: string,
): boolean {
  if (hasForumPermission(permissions, FORUM_PERMISSIONS.POST_UPDATE_ANY)) return true;
  if (!user) return false;
  return user.id === authorId && hasForumPermission(permissions, FORUM_PERMISSIONS.POST_UPDATE_OWN);
}

export function canDeletePost(
  permissions: readonly ForumPermission[],
  user: ForumUser | null,
  authorId: string,
): boolean {
  if (hasForumPermission(permissions, FORUM_PERMISSIONS.POST_DELETE_ANY)) return true;
  if (!user) return false;
  return user.id === authorId && hasForumPermission(permissions, FORUM_PERMISSIONS.POST_DELETE_OWN);
}
