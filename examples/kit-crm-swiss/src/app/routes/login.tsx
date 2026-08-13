import { redirect } from "@kamod-ch/otok/server";
import { getAuthRuntime } from "@kamod-ch/otok-auth";
import { CRM_USERS } from "../../lib/auth-users.js";
import { CrmShell } from "../components/crm-shell.js";
import { Button } from "@kamod-ch/ui/button";

export const loader = () => ({ users: CRM_USERS });

export async function action({ formData, hono }: { formData?: FormData; hono: unknown }) {
  const userId = String(formData?.get("userId") ?? "");
  if (!userId) return { error: "User required" };
  await getAuthRuntime().helpers.createSession(hono as never, userId);
  redirect("/crm", 303);
}

export default function LoginPage({ data }: { data: { users: typeof CRM_USERS } }) {
  return (
    <CrmShell>
      <div class="mx-auto max-w-sm space-y-4 rounded-lg border border-border p-6">
        <div>
          <h1 class="text-xl font-semibold">Swiss CRM — Anmeldung</h1>
          <p class="text-sm text-muted-foreground">Referenzprodukt (Dev-Login)</p>
        </div>
        <form method="post" class="space-y-4">
          <label class="block space-y-1 text-sm">
            <span>Benutzer</span>
            <select
              name="userId"
              required
              class="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {data.users.map((u) => (
                <option value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" class="w-full">
            Anmelden
          </Button>
        </form>
      </div>
    </CrmShell>
  );
}
