import type { OrgRole, SaasPermission, SaasPlan } from "../db/types.js";

const ROLE_PERMISSIONS: Record<OrgRole, readonly SaasPermission[]> = {
  owner: [
    "dashboard:access",
    "org:read",
    "org:update",
    "team:read",
    "team:invite",
    "team:remove",
    "billing:read",
    "billing:manage",
    "audit:read",
  ],
  admin: [
    "dashboard:access",
    "org:read",
    "org:update",
    "team:read",
    "team:invite",
    "team:remove",
    "billing:read",
    "billing:manage",
    "audit:read",
  ],
  member: ["dashboard:access", "org:read", "team:read", "billing:read"],
};

const PLAN_MEMBER_LIMIT: Record<SaasPlan, number | null> = {
  free: 1,
  pro: 5,
  team: null,
};

const PLAN_FEATURES: Record<SaasPlan, readonly SaasPermission[]> = {
  free: ["dashboard:access", "org:read", "team:read", "billing:read"],
  pro: [
    "dashboard:access",
    "org:read",
    "org:update",
    "team:read",
    "team:invite",
    "billing:read",
    "billing:manage",
    "audit:read",
  ],
  team: [
    "dashboard:access",
    "org:read",
    "org:update",
    "team:read",
    "team:invite",
    "team:remove",
    "billing:read",
    "billing:manage",
    "audit:read",
  ],
};

export function permissionsForRole(role: OrgRole): readonly SaasPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function memberLimitForPlan(plan: SaasPlan): number | null {
  return PLAN_MEMBER_LIMIT[plan];
}

export function can(role: OrgRole, plan: SaasPlan, permission: SaasPermission): boolean {
  if (!PLAN_FEATURES[plan].includes(permission)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canInviteMore(plan: SaasPlan, currentMembers: number): boolean {
  const limit = memberLimitForPlan(plan);
  if (limit === null) return true;
  return currentMembers < limit;
}

export type { SaasPermission } from "../db/types.js";
export { PLAN_FEATURES, ROLE_PERMISSIONS };
