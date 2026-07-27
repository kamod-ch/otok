import { Button } from "@kamod-ch/ui/button";
import { SparklesIcon } from "@kamod-ch/icons/shadcn";
import ThemeControls from "../islands/theme-controls";

export default function Home() {
  return (
    <main class="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div class="flex items-center gap-3 text-primary">
        <SparklesIcon class="size-8" aria-hidden="true" />
        <p class="text-sm font-medium uppercase tracking-wide">Otok + Kamod</p>
      </div>
      <div class="space-y-3">
        <h1 class="text-4xl font-semibold tracking-tight">Kamod integration starter</h1>
        <p class="text-muted-foreground">
          Tailwind v4, Kamod UI, and tree-shaken icons — wired through{" "}
          <code class="rounded bg-muted px-1.5 py-0.5 text-sm">@kamod-ch/otok-kamod</code>, not Otok core.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Button asChild>
          <a href="https://ui.kamod.ch/" target="_blank" rel="noreferrer">
            Kamod UI docs
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://github.com/kamod-ch/otok">Otok repository</a>
        </Button>
      </div>
      <ThemeControls />
    </main>
  );
}
