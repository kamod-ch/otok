import { defineAction } from "@kamod-ch/otok-validation/loader";
import { redirect, type OtokPageProps } from "otok/server";
import { contactSchema } from "../../../schemas/contact.js";
import type { ContactsDatabase } from "../../../db/types.js";

type FormFailure = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
};

export const action = defineAction({
  schema: contactSchema,
  handler: async ({ input, db }) => {
    if (!db) throw new Error("db required");
    await db
      .insertInto("contacts")
      .values({ name: input.name, email: input.email })
      .execute();

    redirect("/contacts", 303);
  },
} satisfies import("@kamod-ch/otok-validation/loader").ActionDefinition<
  typeof contactSchema,
  import("kysely").Kysely<ContactsDatabase>,
  void
>);

export default function NewContact({ actionData }: OtokPageProps) {
  const failure = actionData as FormFailure | undefined;
  const values = failure?.values ?? {};

  return (
    <section>
      <h1>New contact</h1>
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
          <button type="submit" style="padding:0.5rem 1rem;background:#2563eb;color:white;border:none;border-radius:0.375rem;">Save</button>
          <a href="/contacts">Cancel</a>
        </div>
      </form>
    </section>
  );
}
