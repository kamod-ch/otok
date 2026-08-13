import { defineCrmLoader, defineCrmAction } from "../../../lib/crm-loader.js";
import { requirePermission, CRM_PERMISSIONS } from "../../../lib/auth-users.js";
import { fail } from "@kamod-ch/otok/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CrmShell } from "../../components/crm-shell.js";
import { Button } from "@kamod-ch/ui/button";

export const loader = defineCrmLoader(async ({ user }) => ({ user }));

export const action = defineCrmAction(async ({ user, repo, formData }) => {
  requirePermission(user, CRM_PERMISSIONS.COMPANIES_IMPORT);
  const intent = String(formData?.get("intent") ?? "");

  if (intent === "zefix-file") {
    const sample = readFileSync(join(process.cwd(), "data/zefix-sample.json"), "utf8");
    return repo.importZefix(user.orgId, sample, user.id);
  }

  if (intent === "zefix") {
    const json = String(formData?.get("json") ?? "");
    if (!json.trim()) fail(400, { message: "JSON required" });
    return repo.importZefix(user.orgId, json, user.id);
  }

  return { ok: false };
});

export default function ImportPage({
  data,
  actionData,
}: {
  data: { user: { name: string } };
  actionData?: {
    imported?: number;
    skipped?: number;
    errors?: { row: number; message: string }[];
    created?: Array<{ id: string; name: string }>;
  };
}) {
  return (
    <CrmShell user={data.user as never}>
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Zefix / JSON Import</h1>
          <p class="text-sm text-muted-foreground">Duplikaterkennung via UID und external_id</p>
        </div>

        {actionData?.imported !== undefined && (
          <div class="rounded-md border border-border bg-muted/40 p-4 text-sm">
            <p>
              Importiert: {actionData.imported}, übersprungen: {actionData.skipped}
              {actionData.errors?.length ? `, Fehler: ${actionData.errors.length}` : ""}
            </p>
            {actionData.created && actionData.created.length > 0 && (
              <p class="mt-2 text-muted-foreground">
                Anreicherungs-Workflow für {actionData.created.length} Unternehmen gestartet.
              </p>
            )}
          </div>
        )}

        <form method="post" class="space-y-2">
          <input type="hidden" name="intent" value="zefix-file" />
          <Button type="submit">Beispieldaten importieren (data/zefix-sample.json)</Button>
        </form>

        <form method="post" class="space-y-3">
          <input type="hidden" name="intent" value="zefix" />
          <textarea
            name="json"
            rows={8}
            placeholder='{"name":"…","uid":"CHE…"}'
            class="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          />
          <Button type="submit">JSON importieren</Button>
        </form>
      </div>
    </CrmShell>
  );
}
