import type { ComponentChildren } from "preact";

type Props = {
  title: string;
  i18n?: { locale?: string };
  children: ComponentChildren;
};

export function AppShell({ title, i18n, children }: Props) {
  const localePrefix = i18n?.locale === "en" ? "/en" : "";
  return (
    <div class="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header class="border-b border-border bg-card/80 backdrop-blur">
        <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href={`${localePrefix}/`} class="text-lg font-semibold tracking-tight">
            {title}
          </a>
          <nav class="flex flex-wrap items-center gap-3 text-sm" aria-label="Main">
            <a href={`${localePrefix}/articles`} class="hover:underline">
              Artikel
            </a>
            <a href={`${localePrefix}/discussions/moderation/queue`} class="hover:underline">
              Moderation
            </a>
            <a href={`${localePrefix}/login`} class="hover:underline">
              Login
            </a>
            <form method="post" action={`${localePrefix}/auth/logout`} class="inline">
              <button type="submit" class="hover:underline">
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main" class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
