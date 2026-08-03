import type { ComponentChildren } from "preact";
import { Button } from "@kamod-ch/ui/button";
import type { I18nClientPayload } from "@kamod-ch/otok-i18n";
import type { SaasContextUser } from "../../db/types.js";

type DashboardShellProps = {
  i18n: I18nClientPayload;
  user: SaasContextUser;
  children: ComponentChildren;
};

export function DashboardShell({ i18n, user, children }: DashboardShellProps) {
  const messages = i18n.messages as Record<string, string>;
  const t = (key: string) => messages[key] ?? key;

  const nav = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/dashboard/team", label: t("nav.team") },
    { href: "/dashboard/billing", label: t("nav.billing") },
    { href: "/dashboard/audit", label: t("nav.audit") },
  ];

  return (
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p class="text-sm font-semibold">{user.orgName}</p>
            <p class="text-xs text-muted-foreground">
              {user.email} · {user.orgRole} · {t(`plan.${user.plan}`)}
            </p>
          </div>
          <nav class="flex flex-wrap items-center gap-2 text-sm">
            {nav.map((item) => (
              <a href={item.href} class="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                {item.label}
              </a>
            ))}
            <form method="post" action="/auth/logout">
              <Button type="submit" variant="ghost" size="sm">
                {t("nav.logout")}
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main class="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
