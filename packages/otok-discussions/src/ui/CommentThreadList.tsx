import type { DiscussionCommentView, DiscussionLabels, DiscussionViewModel } from "./types.js";
import { CommentCard } from "./CommentCard.js";
import { InlineReplyComposer } from "./InlineReplyComposer.js";
import { ReportFormPanel } from "./ReportFormPanel.js";
import { discussionsThreadViewUrl } from "./thread-url.js";

export interface CommentThreadListProps {
  comments: DiscussionCommentView[];
  labels: DiscussionLabels;
  model: DiscussionViewModel;
  canReact: boolean;
  actionUrl: string;
  csrfToken?: string;
  depth?: number;
}

export function CommentThreadList({
  comments,
  labels,
  model,
  canReact,
  actionUrl,
  csrfToken,
  depth = 0,
}: CommentThreadListProps) {
  const maxDepth = model.maxDepth ?? 8;
  const maxCommentLength = model.maxCommentLength ?? 10_000;
  const formBase = model.form ?? { actionUrl, intent: "comment" as const };

  return (
    <ol
      class={`grid list-none gap-4 p-0 ${depth ? "mt-3 border-l border-border pl-4" : ""}`}
      role="list"
      aria-label={depth === 0 ? labels.commentListLabel : undefined}
    >
      {comments.map((comment) => {
        const focused = model.focusCommentId === comment.id;
        const editOpen = model.editCommentId === comment.id;
        const reportOpen = model.reportCommentId === comment.id;

        return (
          <li key={comment.id} class="grid gap-3">
            <CommentCard
              comment={comment}
              labels={labels}
              viewerUserId={model.viewer.userId}
              canReact={canReact}
              actionUrl={actionUrl}
              csrfToken={csrfToken}
              permalinkHref={comment.permalinkUrl}
              focused={focused}
              reportHref={
                comment.permissions?.canReport && model.basePath && model.subjectId
                  ? discussionsThreadViewUrl(model.basePath, model.subjectId, {
                      sort: model.sort,
                      report: comment.id,
                    })
                  : undefined
              }
              reportLabel={labels.reportAction}
              editOpen={editOpen}
              ownerForm={{ actionUrl, csrfToken }}
              basePath={model.basePath}
              subjectId={model.subjectId}
              sort={model.sort}
              maxCommentLength={maxCommentLength}
              reactionRedirectTo={model.form?.redirectTo}
            />
            {reportOpen && model.basePath && model.subjectId ? (
              <ReportFormPanel
                open
                commentId={comment.id}
                labels={labels}
                form={{ actionUrl, csrfToken }}
                basePath={model.basePath}
                subjectId={model.subjectId}
                sort={model.sort}
                formErrors={model.formErrors}
              />
            ) : null}
            {comment.replies?.length ? (
              <CommentThreadList
                comments={comment.replies}
                labels={labels}
                model={model}
                canReact={canReact}
                actionUrl={actionUrl}
                csrfToken={csrfToken}
                depth={depth + 1}
              />
            ) : null}
            {comment.showAllRepliesUrl ? (
              <p>
                <a
                  href={comment.showAllRepliesUrl}
                  class="text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {labels.showReplies(comment.directReplyCount ?? 0)}
                </a>
              </p>
            ) : null}
            {comment.permissions?.canReply &&
            model.viewer.isAuthenticated &&
            formBase &&
            (comment.depth ?? 0) < maxDepth ? (
              <InlineReplyComposer
                labels={labels}
                parentCommentId={comment.id}
                form={{ ...formBase, actionUrl, csrfToken, redirectTo: actionUrl }}
                maxCommentLength={maxCommentLength}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
