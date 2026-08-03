import type { ComponentChildren } from "preact";
import { Button } from "@kamod-ch/ui/button";
import type { CrmSessionUser } from "../../lib/auth-users.js";

type CrmShellProps = {
  title?: string;
  user?: CrmSessionUser;
  children: ComponentChildren;
};

export function CrmShell({ title = "Swiss CRM", user, children }: CrmShellProps) {
  return (
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <a href="/crm" class="font-semibold tracking-tight">
            {title}
          </a>
          <nav class="flex items-center gap-3 text-sm">
            <a href="/crm" class="text-muted-foreground hover:text-foreground">
              Unternehmen
            </a>
            <a href="/crm/import" class="text-muted-foreground hover:text-foreground">
              Import
            </a>
            <a href="/crm/pipelines" class="text-muted-foreground hover:text-foreground">
              Pipelines
            </a>
            <a href="/crm/audit" class="text-muted-foreground hover:text-foreground">
              Audit
            </a>
            {user ? (
              <>
                <span class="text-muted-foreground">{user.name}</span>
                <form method="post" action="/auth/logout">
                  <Button type="submit" variant="ghost" size="sm">
                    Abmelden
                  </Button>
                </form>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href="/login">Anmelden</a>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main class="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
