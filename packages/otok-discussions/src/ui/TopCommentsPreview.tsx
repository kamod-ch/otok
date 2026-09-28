import type { DiscussionCommentView, DiscussionLabels } from "./types.js";
import { CommentCard } from "./CommentCard.js";

export interface TopCommentsPreviewProps {
  comments: DiscussionCommentView[];
  labels: DiscussionLabels;
  viewerUserId?: string;
  canReact: boolean;
  actionUrl: string;
  csrfToken?: string;
  listLabel?: string;
}

export function TopCommentsPreview({
  comments,
  labels,
  viewerUserId,
  canReact,
  actionUrl,
  csrfToken,
  listLabel = "Top-Kommentare",
}: TopCommentsPreviewProps) {
  if (!comments.length) {
    return (
      <div class="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
        <p class="font-medium text-foreground">{labels.emptyTitle}</p>
        <p class="mt-1 text-sm text-muted-foreground">{labels.emptyDescription}</p>
      </div>
    );
  }

  return (
    <ol class="grid list-none gap-4 p-0" aria-label={listLabel}>
      {comments.map((comment) => (
        <li key={comment.id}>
          <CommentCard
            comment={comment}
            labels={labels}
            viewerUserId={viewerUserId}
            canReact={canReact}
            actionUrl={actionUrl}
            csrfToken={csrfToken}
          />
        </li>
      ))}
    </ol>
  );
}
