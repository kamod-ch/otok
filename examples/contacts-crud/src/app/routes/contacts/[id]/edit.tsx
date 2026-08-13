import { defineLoader } from "@kamod-ch/otok-kysely/loader";
import { defineAction } from "@kamod-ch/otok-validation/loader";
import { parseParams } from "@kamod-ch/otok-validation";
import { notFound, redirect, type OtokPageProps } from "@kamod-ch/otok/server";
import { contactIdSchema, contactUpdateSchema } from "../../../../schemas/contact.js";
import type { ContactsDatabase } from "../../../../db/types.js";

type FormFailure = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
};

export const loader = defineLoader<{ contact: import("../../../../db/types.js").Contact }, ContactsDatabase>(async ({ db, params }) => {
  const { id } = await parseParams(params, contactIdSchema);
  const contact = await db.selectFrom("contacts").selectAll().where("id", "=", id).executeTakeFirst();
  if (!contact) notFound("Contact not found");
  return { contact };
});

export const action = defineAction({
  schema: contactUpdateSchema,
  handler: async ({ input, db, params }) => {
    if (!db) throw new Error("db required");
    const { id } = await parseParams(params, contactIdSchema);
    await db
      .updateTable("contacts")
      .set({ name: input.name, email: input.email })
      .where("id", "=", id)
      .execute();
    redirect(`/contacts/${id}`, 303);
  },
} satisfies import("@kamod-ch/otok-validation/loader").ActionDefinition<
  typeof contactUpdateSchema,
  import("kysely").Kysely<ContactsDatabase>,
  void
>);

export default function EditContact({ data, actionData }: OtokPageProps<{ contact: { id: number; name: string; email: string } }>) {
  const failure = actionData as FormFailure | undefined;
  const values = failure?.values ?? data.contact;

  return (
    <section>
      <h1>Edit contact</h1>
      <form method="post" style="max-width:28rem;display:flex;flex-direction:column;gap:1rem;">
        {failure?.message ? <p role="alert" style="color:#dc2626;">{failure.message}</p> : null}

        <label>
          Name
          <input name="name" value={values.name ?? ""} aria-invalid={Boolean(failure?.fieldErrors?.name)} style="display:block;width:100%;margin-top:0.25rem;padding:0.5rem;" />
        </label>
        {failure?.fieldErrors?.name?.map((error) => (
          <p role="alert" style="color:#dc2626;margin:0;">{error}</p>
        ))}

        <label>
          Email
          <input name="email" type="email" value={values.email ?? ""} aria-invalid={Boolean(failure?.fieldErrors?.email)} style="display:block;width:100%;margin-top:0.25rem;padding:0.5rem;" />
        </label>
        {failure?.fieldErrors?.email?.map((error) => (
          <p role="alert" style="color:#dc2626;margin:0;">{error}</p>
        ))}

        <div style="display:flex;gap:0.75rem;">
          <button type="submit" style="padding:0.5rem 1rem;background:#2563eb;color:white;border:none;border-radius:0.375rem;">Update</button>
          <a href={`/contacts/${data.contact.id}`}>Cancel</a>
        </div>
      </form>

      <form method="post" action={`/contacts/${data.contact.id}/delete`} style="margin-top:2rem;">
        <button type="submit" style="padding:0.5rem 1rem;background:#dc2626;color:white;border:none;border-radius:0.375rem;">Delete contact</button>
      </form>
    </section>
  );
}
