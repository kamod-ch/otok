import type { Kysely } from "kysely";
import { getMailClient } from "@kamod-ch/otok-mail";
import { tryGetMailRuntime } from "@kamod-ch/otok-mail";
import type { DevjobsDatabase } from "../db/types.js";
import { parseImportCsv } from "./import-csv.js";
import { newId, slugify } from "./ids.js";

export type DevjobsQueueJobs = {
  "devjobs.import-csv": { importId: string };
};

export async function processCsvImport(db: Kysely<DevjobsDatabase>, importId: string): Promise<void> {
  const record = await db.selectFrom("job_import").selectAll().where("id", "=", importId).executeTakeFirst();
  if (!record) throw new Error(`import ${importId} not found`);

  await db
    .updateTable("job_import")
    .set({ status: "processing", updated_at: new Date().toISOString(), last_error: null })
    .where("id", "=", importId)
    .execute();

  try {
    const parsed = parseImportCsv(record.csv_content);
    if (parsed.error) throw new Error(parsed.error);

    let imported = 0;
    for (const row of parsed.rows) {
      const existing = await db
        .selectFrom("job_posting")
        .select("id")
        .where("company_id", "=", record.company_id)
        .where("external_ref", "=", row.external_ref)
        .executeTakeFirst();
      if (existing) continue;

      const slugBase = slugify(row.title) || "job";
      const slug = `${slugBase}-${row.external_ref}`.slice(0, 64);
      await db
        .insertInto("job_posting")
        .values({
          id: newId("job"),
          company_id: record.company_id,
          slug,
          title: row.title,
          description: row.description,
          visibility: row.visibility,
          external_ref: row.external_ref,
          created_by: record.created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();
      imported += 1;
    }

    await db
      .updateTable("job_import")
      .set({
        status: "completed",
        rows_total: parsed.rows.length,
        rows_imported: imported,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", importId)
      .execute();

    const mail = tryGetMailRuntime();
    if (mail) {
      const user = await db
        .selectFrom("app_user")
        .select(["email"])
        .where("id", "=", record.created_by)
        .executeTakeFirst();
      await getMailClient().send({
        to: user?.email ?? "unknown@local",
        subject: "Import complete",
        text: `Imported ${imported} of ${parsed.rows.length} rows for import ${importId}.`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "import failed";
    await db
      .updateTable("job_import")
      .set({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .where("id", "=", importId)
      .execute();
    throw error;
  }
}
