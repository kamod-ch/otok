import { ensureRefDb, refConnectionString } from "../src/db/client.js";

export { refConnectionString };

export async function countCommentsForThread(threadId: string): Promise<number> {
  const db = await ensureRefDb();
  const row = await db
    .selectFrom("discussions_comments")
    .select((eb) => eb.fn.countAll<number>().as("c"))
    .where("thread_id", "=", threadId)
    .executeTakeFirst();
  return Number(row?.c ?? 0);
}

export async function countReports(): Promise<number> {
  const db = await ensureRefDb();
  const row = await db
    .selectFrom("discussions_reports")
    .select((eb) => eb.fn.countAll<number>().as("c"))
    .executeTakeFirst();
  return Number(row?.c ?? 0);
}

export async function countReactionsForComment(commentId: string): Promise<number> {
  const db = await ensureRefDb();
  const row = await db
    .selectFrom("discussions_reactions")
    .select((eb) => eb.fn.countAll<number>().as("c"))
    .where("comment_id", "=", commentId)
    .executeTakeFirst();
  return Number(row?.c ?? 0);
}

export async function findThreadIdBySubjectSlug(slug: string): Promise<string | null> {
  const db = await ensureRefDb();
  const row = await db
    .selectFrom("discussions_threads")
    .select(["id"])
    .where("subject_id", "=", slug)
    .executeTakeFirst();
  return row?.id ?? null;
}
