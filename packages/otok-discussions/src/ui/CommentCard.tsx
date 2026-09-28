import { Badge } from "@kamod-ch/ui/badge";
import type { CommentSort } from "../types/domain.js";
import type { DiscussionCommentView, DiscussionFormConfig, DiscussionLabels } from "./types.js";
import { AuthorMeta } from "./AuthorMeta.js";
import { CommentBody } from "./CommentBody.js";
import { CommentActions } from "./CommentActions.js";
import { CommentOwnerActions } from "./CommentOwnerActions.js";

export interface CommentCardProps {
  comment: DiscussionCommentView;
  labels: DiscussionLabels;
  viewerUserId?: string;
  canReact: boolean;
  actionUrl: string;
  csrfToken?: string;
  permalinkHref?: string;
  focused?: boolean;
  reportHref?: string;
  reportLabel?: string;
  editOpen?: boolean;
  ownerForm?: Pick<DiscussionFormConfig, "actionUrl" | "csrfToken">;
  basePath?: string;
  subjectId?: string;
  sort?: CommentSort;
  maxCommentLength?: number;
  reactionRedirectTo?: string;
}

export function CommentCard({
  comment,
  labels,
  viewerUserId,
  canReact,
  actionUrl,
  csrfToken,
  permalinkHref,
  focused,
  reportHref,
  reportLabel,
  editOpen,
  ownerForm,
  basePath,
  subjectId,
  sort,
  maxCommentLength = 10_000,
  reactionRedirectTo,
}: CommentCardProps) {
  const isOwnPending = comment.status === "pending" && viewerUserId === comment.author.id;

  return (
    <article
      id={`comment-${comment.id}`}
      class={`scroll-mt-24 rounded-lg border border-border bg-card p-4 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:scroll-auto`}
      aria-label={labels.commentByAuthor(comment.author.displayName)}
      aria-labelledby={`comment-author-${comment.id}`}
      data-comment-id={comment.id}
      data-comment-status={comment.status}
      tabIndex={focused ? -1 : undefined}
      autofocus={focused ? true : undefined}
    >
      <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div id={`comment-author-${comment.id}`} class="min-w-0 flex-1">
          <AuthorMeta
            author={comment.author}
            createdAt={comment.createdAt}
            displayTime={comment.displayTime}
            permalinkHref={permalinkHref}
            permalinkLabel={labels.permalink}
          />
        </div>
        {isOwnPending ? (
          <Badge variant="warning" size="sm">
            {labels.pendingBadge}
          </Badge>
        ) : null}
      </div>
      <CommentBody
        bodyMarkdown={comment.bodyMarkdown}
        isPlaceholder={comment.isPlaceholder}
        placeholderText={labels.moderatedPlaceholder}
        isPending={isOwnPending}
      />
      {isOwnPending ? (
        <p class="mt-2 text-xs text-muted-foreground">{labels.composerPendingHint}</p>
      ) : (
        <footer class="mt-4 space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <CommentActions
              commentId={comment.id}
              scorePositive={comment.scorePositive}
              scoreNegative={comment.scoreNegative}
              viewerReaction={comment.viewerReaction}
              canReact={canReact && !comment.isPlaceholder}
              actionUrl={actionUrl}
              csrfToken={csrfToken}
              labels={labels}
              redirectTo={reactionRedirectTo}
            />
            {reportHref && reportLabel ? (
              <a
                href={reportHref}
                class="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {reportLabel}
              </a>
            ) : null}
          </div>
          {ownerForm && basePath && subjectId ? (
            <CommentOwnerActions
              comment={comment}
              labels={labels}
              form={ownerForm}
              basePath={basePath}
              subjectId={subjectId}
              sort={sort}
              editOpen={Boolean(editOpen)}
              maxCommentLength={maxCommentLength}
            />
          ) : null}
        </footer>
      )}
    </article>
  );
}
