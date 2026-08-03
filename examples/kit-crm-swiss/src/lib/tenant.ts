import type { CrmSessionUser } from "./auth-users.js";

export function getSessionUser(ctx: { user?: CrmSessionUser | null }): CrmSessionUser {
  if (!ctx.user) throw new Error("Unauthorized");
  return ctx.user;
}

export function tenantId(user: CrmSessionUser): string {
  return user.orgId;
}
