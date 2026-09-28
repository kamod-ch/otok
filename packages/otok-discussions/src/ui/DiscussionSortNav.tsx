import type { CommentSort } from "../types/domain.js";
import type { DiscussionLabels } from "./types.js";
import { discussionsThreadViewUrl } from "./thread-url.js";

export interface DiscussionSortNavProps {
  basePath: string;
  subjectId: string;
  active: CommentSort;
  labels: DiscussionLabels;
}

const SORTS: Array<{
  id: CommentSort;
  labelKey: keyof Pick<DiscussionLabels, "sortNewest" | "sortOldest" | "sortPopular">;
}> = [
  { id: "newest", labelKey: "sortNewest" },
  { id: "oldest", labelKey: "sortOldest" },
  { id: "top", labelKey: "sortPopular" },
];

export function DiscussionSortNav({ basePath, subjectId, active, labels }: DiscussionSortNavProps) {
  return (
    <nav aria-label={labels.sortNavLabel} class="flex flex-wrap gap-2">
      {SORTS.map((sort) => {
        const selected = active === sort.id;
        const href = discussionsThreadViewUrl(basePath, subjectId, { sort: sort.id });
        return (
          <a
            key={sort.id}
            href={href}
            aria-current={selected ? "true" : undefined}
            class={`inline-flex min-h-8 items-center rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-discussion-sort={sort.id}
          >
            {labels[sort.labelKey]}
          </a>
        );
      })}
    </nav>
  );
}
