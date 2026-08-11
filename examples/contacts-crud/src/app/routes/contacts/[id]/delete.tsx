import { defineAction } from "@kamod-ch/otok-validation/loader";
import { parseParams } from "@kamod-ch/otok-validation";
import { redirect } from "otok/server";
import { contactIdSchema } from "../../../../schemas/contact.js";
import type { ContactsDatabase } from "../../../../db/types.js";

export const action = defineAction<import("kysely").Kysely<ContactsDatabase>>(async ({ db, params }) => {
  if (!db) throw new Error("db required");
  const database = db;
  const { id } = await parseParams(params, contactIdSchema);
  await database.deleteFrom("contacts").where("id", "=", id).execute();
  redirect("/contacts", 303);
});

export default function DeleteContact() {
  return null;
}
