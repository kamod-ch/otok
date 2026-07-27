import type { Kysely } from "kysely";
import type { ContactsDatabase } from "../src/db/types.js";

export default async function seed(db: Kysely<ContactsDatabase>) {
  const existing = await db.selectFrom("contacts").select("id").executeTakeFirst();
  if (existing) return;

  await db
    .insertInto("contacts")
    .values([
      { name: "Ada Lovelace", email: "ada@example.com" },
      { name: "Grace Hopper", email: "grace@example.com" },
    ])
    .execute();
}
