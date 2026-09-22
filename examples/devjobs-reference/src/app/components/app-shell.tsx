import type { ComponentChildren } from "preact";
import { Button } from "@kamod-ch/ui/button";
import type { I18nClientPayload } from "@kamod-ch/otok-i18n";
import type { DevjobsUser } from "../../db/types.js";

type AppShellProps = {
  title: string;
  i18n: I18nClientPayload;
  user?: DevjobsUser | null;
  children: ComponentChildren;
};

export function AppShell({ title, i18n, user, children }: AppShellProps) {
  const messages = i18n.messages as Record<string, string>;
  const t = (key: string) => messages[key] ?? key;

  return (
    <div class="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header class="border-b border-border">
        <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="/jobs" class="font-semibold tracking-tight">
            {title}
          </a>
          <nav class="flex flex-wrap items-center gap-2 text-sm" aria-label="Main">
            <Button asChild variant="ghost" size="sm">
              <a href="/jobs">{t("nav.jobs")}</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/impressum">{t("nav.impressum")}</a>
            </Button>
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href="/employer/jobs">{t("nav.employer")}</a>
                </Button>
                <form method="post" action="/auth/logout">
                  <Button type="submit" variant="outline" size="sm">
                    {t("nav.logout")}
                  </Button>
                </form>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href="/login">{t("nav.login")}</a>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main id="main" class="focus:outline-none" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
