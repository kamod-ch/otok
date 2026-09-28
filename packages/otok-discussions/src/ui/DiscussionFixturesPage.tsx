import type { OtokPageProps } from "@kamod-ch/otok/server";
import { Discussion } from "./Discussion.js";
import { discussionFixtureKeys, discussionFixtureViewModels } from "./fixtures/view-models.js";

export function DiscussionFixturesPage(_props: OtokPageProps) {
  return (
    <main class="min-h-screen bg-background text-foreground">
      <header class="border-b border-border px-6 py-8">
        <h1 class="text-2xl font-semibold">Discussion UI fixtures</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
          Visuelle Zustände für @kamod-ch/otok-discussions/ui (Standard-Locale Deutsch). Theme-Tokens und{" "}
          <code class="text-xs">class="dark"</code> auf <code class="text-xs">html</code> für Dark-Mode-Checks in der
          Host-App. Mobile: Viewport ≤390px; Zoom 200–400% manuell prüfen (siehe docs/i18n-a11y.md).
        </p>
      </header>
      <div class="grid gap-16 py-10">
        {discussionFixtureKeys.map((key) => (
          <section key={key} id={`fixture-${key}`} class="scroll-mt-8 border-t border-border pt-10">
            <h2 class="mb-4 px-6 font-mono text-sm uppercase tracking-wide text-muted-foreground">{key}</h2>
            <Discussion model={discussionFixtureViewModels[key]!} />
          </section>
        ))}
      </div>
    </main>
  );
}
