import { Badge } from "@kamod-ch/ui/badge";
import type { DiscussionLabels, DiscussionViewModel } from "./types.js";

export interface DiscussionHeaderProps {
  model: Pick<DiscussionViewModel, "thread" | "layout">;
  labels: DiscussionLabels;
  headingId: string;
}

export function DiscussionHeader({ model, labels, headingId }: DiscussionHeaderProps) {
  const title = model.thread?.title ?? labels.discussionHeading;
  const count = model.thread?.replyCount ?? 0;

  return (
    <header class="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div class="min-w-0">
        <h2 id={headingId} class="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p class="text-sm text-muted-foreground">{labels.replyCount(count)}</p>
      </div>
      {model.thread?.status && model.thread.status !== "open" ? (
        <Badge variant="outline" size="sm" class="shrink-0 uppercase tracking-wide">
          {model.thread.status.replace("_", " ")}
        </Badge>
      ) : null}
    </header>
  );
}
