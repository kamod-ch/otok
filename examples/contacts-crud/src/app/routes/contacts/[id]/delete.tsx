import { defineAction } from "@kamod-ch/otok-validation/loader";
import { parseParams } from "@kamod-ch/otok-validation";
import { redirect } from "otok/server";
import { contactIdSchema } from "../../../schemas/contact.js";
import type { ContactsDatabase } from "../../../db/types.js";

export const action = defineAction(async ({ db, params }) => {
  const database = db as import("kysely").Kysely<ContactsDatabase>;
  const { id } = await parseParams(params, contactIdSchema);
  await database.deleteFrom("contacts").where("id", "=", id).execute();
  redirect("/contacts", 303);
});

export default function DeleteContact() {
  return null;
}
