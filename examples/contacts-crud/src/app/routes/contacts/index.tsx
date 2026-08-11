import { defineLoader } from "@kamod-ch/otok-kysely/loader";
import type { ContactsDatabase, Contact } from "../../../db/types.js";

export const loader = defineLoader<{ contacts: Contact[] }, ContactsDatabase>(async ({ db }) => {
  const contacts = await db.selectFrom("contacts").selectAll().orderBy("id", "desc").execute();
  return { contacts };
});

export default function ContactsIndex({
  data,
}: {
  data: { contacts: Array<{ id: number; name: string; email: string; created_at: string }> };
}) {
  return (
    <section>
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h1>Contacts</h1>
        <a href="/contacts/new" style="padding:0.5rem 1rem;background:#2563eb;color:white;border-radius:0.375rem;text-decoration:none;">
          New contact
        </a>
      </header>

      {data.contacts.length === 0 ? (
        <p>No contacts yet. <a href="/contacts/new">Create one</a>.</p>
      ) : (
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #e5e7eb;">Name</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #e5e7eb;">Email</th>
              <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #e5e7eb;">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.contacts.map((contact) => (
              <tr key={contact.id}>
                <td style="padding:0.5rem;border-bottom:1px solid #f3f4f6;">{contact.name}</td>
                <td style="padding:0.5rem;border-bottom:1px solid #f3f4f6;">{contact.email}</td>
                <td style="padding:0.5rem;border-bottom:1px solid #f3f4f6;">
                  <a href={`/contacts/${contact.id}`}>View</a>
                  {" · "}
                  <a href={`/contacts/${contact.id}/edit`}>Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
