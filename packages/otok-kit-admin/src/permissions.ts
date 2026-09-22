export const ADMIN_PERMISSIONS = {
  USERS_READ: "admin:users:read",
  USERS_WRITE: "admin:users:write",
  ROLES_READ: "admin:roles:read",
  ROLES_WRITE: "admin:roles:write",
  ORG_READ: "admin:org:read",
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export function hasAdminPermission(granted: readonly string[], required: AdminPermission): boolean {
  return granted.includes(required) || granted.includes("admin:*");
}
