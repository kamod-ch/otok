import { CommentComposerShell } from "./CommentComposerShell.js";
import type { DiscussionFormConfig, DiscussionLabels } from "./types.js";

export interface InlineReplyComposerProps {
  labels: DiscussionLabels;
  parentCommentId: string;
  form: DiscussionFormConfig;
  maxCommentLength: number;
}

export function InlineReplyComposer({ labels, parentCommentId, form, maxCommentLength }: InlineReplyComposerProps) {
  return (
    <div class="mt-3 border-l-2 border-border pl-4">
      <CommentComposerShell
        labels={{
          ...labels,
          composerLabel: labels.replyLabel,
          composerSubmit: labels.replySubmit,
        }}
        form={{
          ...form,
          intent: "reply",
          parentCommentId,
          idempotencyKey: `reply-${parentCommentId}`,
        }}
        maxCommentLength={maxCommentLength}
      />
    </div>
  );
}
