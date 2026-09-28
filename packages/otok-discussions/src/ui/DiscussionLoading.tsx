import type { DiscussionLabels } from "./types.js";

export function DiscussionLoading({ labels }: { labels: DiscussionLabels }) {
  return (
    <div class="grid gap-4" role="status" aria-live="polite" aria-busy="true" aria-label={labels.a11yLoadingBusy}>
      <p class="sr-only">{labels.loading}</p>
      <div class="motion-safe:animate-pulse grid gap-3 rounded-lg border border-border bg-card p-4">
        <div class="flex gap-3">
          <div class="size-8 rounded-full bg-muted" />
          <div class="grid flex-1 gap-2">
            <div class="h-3 w-1/3 max-w-[8rem] rounded bg-muted" />
            <div class="h-3 w-full rounded bg-muted" />
            <div class="h-3 w-5/6 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
