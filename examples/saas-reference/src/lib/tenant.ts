import type { Kysely } from "kysely";
import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { OrgRole, SaasContextUser, SaasDatabase, SaasUser } from "../db/types.js";
import { ORG_COOKIE } from "../db/types.js";
import { getOrgPlan } from "./billing-adapter.js";

export async function listUserOrganizations(db: Kysely<SaasDatabase>, userId: string) {
  return db
    .selectFrom("org_member")
    .innerJoin("organization", "organization.id", "org_member.org_id")
    .select([
      "organization.id",
      "organization.slug",
      "organization.name",
      "org_member.role",
    ])
    .where("org_member.user_id", "=", userId)
    .orderBy("organization.name")
    .execute();
}

export async function resolveOrgContext(
  db: Kysely<SaasDatabase>,
  user: SaasUser,
  hono: Context,
): Promise<SaasContextUser | null> {
  const orgs = await listUserOrganizations(db, user.id);
  if (orgs.length === 0) return null;

  const cookieOrg = getCookie(hono, ORG_COOKIE);
  const active =
    orgs.find((o) => o.id === cookieOrg) ??
    orgs.find((o) => o.slug === cookieOrg) ??
    orgs[0];

  const plan = await getOrgPlan(db, active.id);

  return {
    ...user,
    orgId: active.id,
    orgSlug: active.slug,
    orgName: active.name,
    orgRole: active.role as OrgRole,
    plan,
    role: active.role as OrgRole,
  };
}

export function setActiveOrgCookie(c: Context, orgId: string): void {
  setCookie(c, ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireOrgMembership(
  db: Kysely<SaasDatabase>,
  userId: string,
  orgId: string,
): Promise<{ role: OrgRole; slug: string; name: string } | null> {
  const row = await db
    .selectFrom("org_member")
    .innerJoin("organization", "organization.id", "org_member.org_id")
    .select(["org_member.role", "organization.slug", "organization.name"])
    .where("org_member.org_id", "=", orgId)
    .where("org_member.user_id", "=", userId)
    .executeTakeFirst();
  if (!row) return null;
  return { role: row.role as OrgRole, slug: row.slug, name: row.name };
}

export async function countOrgMembers(db: Kysely<SaasDatabase>, orgId: string): Promise<number> {
  const row = await db
    .selectFrom("org_member")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("org_id", "=", orgId)
    .executeTakeFirst();
  return Number(row?.count ?? 0);
}

/** All org-scoped queries must filter by orgId from verified membership. */
export function tenantScope(orgId: string) {
  return { orgId };
}
