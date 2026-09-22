import type { Kysely } from "kysely";
import type { Context } from "hono";
import type { DevjobsContextUser, DevjobsDatabase, DevjobsUser } from "../db/types.js";

export async function resolveCompanyContext(
  db: Kysely<DevjobsDatabase>,
  user: DevjobsUser,
): Promise<DevjobsContextUser | null> {
  const row = await db
    .selectFrom("company_member")
    .innerJoin("company", "company.id", "company_member.company_id")
    .select(["company.id", "company.slug", "company.name", "company_member.role"])
    .where("company_member.user_id", "=", user.id)
    .orderBy("company.name")
    .executeTakeFirst();
  if (!row) return null;
  return {
    ...user,
    companyId: row.id,
    companySlug: row.slug,
    companyName: row.name,
    role: row.role,
  };
}

export async function requireJobOwnership(
  db: Kysely<DevjobsDatabase>,
  jobId: string,
  companyId: string,
): Promise<boolean> {
  const row = await db.selectFrom("job_posting").select("company_id").where("id", "=", jobId).executeTakeFirst();
  return row?.company_id === companyId;
}

export async function canViewJob(
  db: Kysely<DevjobsDatabase>,
  job: { visibility: string; company_id: string },
  viewerCompanyId?: string,
): Promise<boolean> {
  if (job.visibility === "public") return true;
  return Boolean(viewerCompanyId && viewerCompanyId === job.company_id);
}

/** Verified tenant for cache scope — never read from client headers or form fields. */
export async function resolveVerifiedTenantId(
  db: Kysely<DevjobsDatabase>,
  userId: string,
): Promise<string | undefined> {
  const row = await db
    .selectFrom("company_member")
    .select("company_id")
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return row?.company_id;
}

export function readLocaleFromContext(c: Context): string | undefined {
  const i18n = c.get("i18n" as never) as { locale?: string } | undefined;
  return i18n?.locale;
}
