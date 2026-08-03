import type { ComponentChildren } from "preact";
import { Button } from "@kamod-ch/ui/button";
import type { I18nClientPayload } from "@kamod-ch/otok-i18n";
import type { SaasUser } from "../../db/types.js";

type AppShellProps = {
  title: string;
  i18n: I18nClientPayload;
  user?: SaasUser | null;
  children: ComponentChildren;
};

export function AppShell({ title, i18n, user, children }: AppShellProps) {
  const messages = i18n.messages as Record<string, string>;
  const t = (key: string) => messages[key] ?? key;

  return (
    <div class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" class="font-semibold tracking-tight">
            {title}
          </a>
          <nav class="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <a href="/dashboard" class="text-muted-foreground hover:text-foreground">
                  {t("nav.dashboard")}
                </a>
                <form method="post" action="/auth/logout">
                  <Button type="submit" variant="ghost" size="sm">
                    {t("nav.logout")}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href="/login">{t("nav.login")}</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/register">{t("nav.register")}</a>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
