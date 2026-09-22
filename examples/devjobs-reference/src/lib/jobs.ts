import type { Kysely } from "kysely";
import type { DevjobsDatabase } from "../db/types.js";
import { slugify } from "./ids.js";

const PAGE_SIZE = 5;

export { PAGE_SIZE };

export async function listPublicJobs(db: Kysely<DevjobsDatabase>, options: { q?: string; page: number }) {
  const page = Math.max(1, options.page);
  const offset = (page - 1) * PAGE_SIZE;
  let query = db
    .selectFrom("job_posting")
    .innerJoin("company", "company.id", "job_posting.company_id")
    .select([
      "job_posting.id",
      "job_posting.slug",
      "job_posting.title",
      "job_posting.description",
      "job_posting.visibility",
      "company.name as company_name",
      "company.slug as company_slug",
    ])
    .where("job_posting.visibility", "=", "public")
    .orderBy("job_posting.updated_at", "desc");

  if (options.q?.trim()) {
    const term = `%${options.q.trim().toLowerCase()}%`;
    query = query.where((eb) =>
      eb.or([eb("job_posting.title", "ilike", term), eb("job_posting.description", "ilike", term)]),
    );
  }

  const rows = await query.limit(PAGE_SIZE).offset(offset).execute();
  const countRow = await db
    .selectFrom("job_posting")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("visibility", "=", "public")
    .$if(Boolean(options.q?.trim()), (qb) => {
      const term = `%${options.q!.trim().toLowerCase()}%`;
      return qb.where((eb) => eb.or([eb("title", "ilike", term), eb("description", "ilike", term)]));
    })
    .executeTakeFirst();

  return { jobs: rows, page, total: Number(countRow?.count ?? 0), pageSize: PAGE_SIZE };
}

export async function uniqueSlug(db: Kysely<DevjobsDatabase>, title: string, excludeId?: string) {
  const base = slugify(title) || "job";
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await db
      .selectFrom("job_posting")
      .select("id")
      .where("slug", "=", slug)
      .$if(Boolean(excludeId), (qb) => qb.where("id", "!=", excludeId!))
      .executeTakeFirst();
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}
