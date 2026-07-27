import { defineLoader } from "@kamod-ch/otok-kysely/loader";
import { parseParams } from "@kamod-ch/otok-validation";
import { notFound } from "otok/server";
import { contactIdSchema } from "../../../schemas/contact.js";

export const loader = defineLoader(async ({ db, params }) => {
  const { id } = await parseParams(params, contactIdSchema);
  const contact = await db.selectFrom("contacts").selectAll().where("id", "=", id).executeTakeFirst();
  if (!contact) notFound("Contact not found");
  return { contact };
});

export default function ContactDetail({ data }: { data: { contact: { id: number; name: string; email: string; created_at: string } } }) {
  const { contact } = data;
  return (
    <section>
      <h1>{contact.name}</h1>
      <p><strong>Email:</strong> {contact.email}</p>
      <p><strong>Created:</strong> {contact.created_at}</p>
      <p>
        <a href={`/contacts/${contact.id}/edit`}>Edit</a>
        {" · "}
        <a href="/contacts">Back to list</a>
      </p>
    </section>
  );
}
