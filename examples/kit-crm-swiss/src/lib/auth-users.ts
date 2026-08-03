import {
  CRM_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_SALES_PERMISSIONS,
  SWISS_DEMO_ORG_ID,
  hasCrmPermission,
  type CrmPermission,
} from "@otok/kit-crm";

export interface CrmSessionUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  roleSlug: string;
  permissions: readonly string[];
  locale: "de" | "fr" | "en" | "it";
}

export const CRM_USERS: CrmSessionUser[] = [
  {
    id: "user-admin",
    orgId: SWISS_DEMO_ORG_ID,
    email: "admin@alpine-sales.ch",
    name: "Claudia Meier",
    roleSlug: "admin",
    permissions: DEFAULT_ADMIN_PERMISSIONS,
    locale: "de",
  },
  {
    id: "user-sales",
    orgId: SWISS_DEMO_ORG_ID,
    email: "sales@alpine-sales.ch",
    name: "Marco Bianchi",
    roleSlug: "sales",
    permissions: DEFAULT_SALES_PERMISSIONS,
    locale: "it",
  },
];

export function resolveCrmSessionUser(userId: string): CrmSessionUser | null {
  return CRM_USERS.find((u) => u.id === userId) ?? null;
}

export function requirePermission(user: CrmSessionUser, permission: CrmPermission): void {
  if (!hasCrmPermission(user.permissions, permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export { CRM_PERMISSIONS };
