import type { DiscussionLabels } from "./types.js";
import { discussionsThreadViewUrl } from "./thread-url.js";
import type { CommentSort } from "../types/domain.js";

export interface ThreadPaginationProps {
  basePath: string;
  subjectId: string;
  sort: CommentSort;
  nextCursor?: string;
  labels: DiscussionLabels;
}

export function ThreadPagination({ basePath, subjectId, sort, nextCursor, labels }: ThreadPaginationProps) {
  if (!nextCursor) return null;
  const href = discussionsThreadViewUrl(basePath, subjectId, { sort, cursor: nextCursor });
  return (
    <p class="text-center">
      <a
        href={href}
        class="inline-flex min-h-8 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {labels.loadMore}
      </a>
    </p>
  );
}
