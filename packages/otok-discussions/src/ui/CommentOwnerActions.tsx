import { Button } from "@kamod-ch/ui/button";
import { Textarea } from "@kamod-ch/ui/textarea";
import type { DiscussionCommentView, DiscussionFormConfig, DiscussionLabels } from "./types.js";
import { HiddenFormFields } from "./HiddenFormFields.js";
import { discussionsThreadViewUrl } from "./thread-url.js";

export interface CommentOwnerActionsProps {
  comment: DiscussionCommentView;
  labels: DiscussionLabels;
  form: Pick<DiscussionFormConfig, "actionUrl" | "csrfToken">;
  basePath: string;
  subjectId: string;
  sort?: import("../types/domain.js").CommentSort;
  editOpen: boolean;
  maxCommentLength: number;
}

export function CommentOwnerActions({
  comment,
  labels,
  form,
  basePath,
  subjectId,
  sort,
  editOpen,
  maxCommentLength,
}: CommentOwnerActionsProps) {
  const perms = comment.permissions;
  if (!perms?.canEdit && !perms?.canDelete) return null;

  const threadUrl = discussionsThreadViewUrl(basePath, subjectId, { sort });

  return (
    <div class="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
      {perms.canEdit ? (
        editOpen ? (
          <form method="post" action={form.actionUrl} class="grid w-full gap-2">
            <HiddenFormFields csrfToken={form.csrfToken} idempotencyKey={`edit-${comment.id}`} />
            <input type="hidden" name="intent" value="edit" />
            <input type="hidden" name="commentId" value={comment.id} />
            <input type="hidden" name="redirectTo" value={threadUrl} />
            <label class="sr-only" for={`edit-body-${comment.id}`}>
              {labels.editAction}
            </label>
            <Textarea
              id={`edit-body-${comment.id}`}
              name="bodyMarkdown"
              required
              maxLength={maxCommentLength}
              defaultValue={comment.bodyMarkdown}
              rows={4}
            />
            <div class="flex gap-2">
              <Button type="submit" size="sm">
                {labels.editSubmit}
              </Button>
              <a href={threadUrl} class="text-sm text-muted-foreground underline-offset-2 hover:underline">
                {labels.reportCancel}
              </a>
            </div>
          </form>
        ) : (
          <a
            href={discussionsThreadViewUrl(basePath, subjectId, { sort, edit: comment.id })}
            class="text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {labels.editAction}
          </a>
        )
      ) : null}
      {perms.canDelete ? (
        <form method="post" action={form.actionUrl} class="inline">
          <HiddenFormFields csrfToken={form.csrfToken} idempotencyKey={`delete-${comment.id}`} />
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="commentId" value={comment.id} />
          <input type="hidden" name="redirectTo" value={threadUrl} />
          <Button type="submit" variant="destructive" size="sm">
            {labels.deleteSubmit}
          </Button>
          <span class="sr-only">{labels.deleteConfirm}</span>
        </form>
      ) : null}
    </div>
  );
}
