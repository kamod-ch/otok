import { BoltIcon, HeartIcon } from "@kamod-ch/icons/lucide";
import { Button } from "@kamod-ch/ui/button";
import type { DiscussionLabels } from "./types.js";
import { HiddenFormFields } from "./HiddenFormFields.js";

export interface CommentActionsProps {
  commentId: string;
  scorePositive: number;
  scoreNegative: number;
  viewerReaction?: { emoji: "👍" | "👎"; reactionId?: string } | null;
  canReact: boolean;
  actionUrl: string;
  csrfToken?: string;
  redirectTo?: string;
  labels: DiscussionLabels;
}

function ReactionForm(props: {
  commentId: string;
  emoji: "👍" | "👎";
  active: boolean;
  count: number;
  countLabel: string;
  actionLabel: string;
  icon: "heart" | "bolt";
  actionUrl: string;
  csrfToken?: string;
  reactionId?: string;
  redirectTo?: string;
}) {
  const removing = props.active && props.reactionId;
  const Icon = props.icon === "heart" ? HeartIcon : BoltIcon;
  const tone = props.icon === "heart" ? "text-destructive" : "text-warning";
  const activeTone = props.active && props.icon === "heart" ? "bg-destructive/15" : props.active ? "bg-warning/15" : "";

  return (
    <form method="post" action={props.actionUrl} class="inline" data-reaction-form={props.commentId}>
      <HiddenFormFields csrfToken={props.csrfToken} idempotencyKey={`react-${props.commentId}-${props.emoji}`} />
      <input type="hidden" name="intent" value="react" />
      <input type="hidden" name="commentId" value={props.commentId} />
      <input type="hidden" name="emoji" value={props.emoji} />
      <input type="hidden" name="mode" value={removing ? "remove" : "set"} />
      {removing ? <input type="hidden" name="reactionId" value={props.reactionId} /> : null}
      {props.redirectTo ? <input type="hidden" name="redirectTo" value={props.redirectTo} /> : null}
      <Button
        type="submit"
        variant={props.active ? "secondary" : "outline"}
        size="sm"
        class={`gap-1.5 ${tone} ${activeTone}`}
        aria-pressed={props.active}
        aria-label={`${props.actionLabel} (${props.countLabel})`}
      >
        <Icon size={16} aria-hidden="true" />
        <span class="tabular-nums">{props.count}</span>
        <span class="sr-only">{props.countLabel}</span>
      </Button>
    </form>
  );
}

export function CommentActions({ redirectTo, ...props }: CommentActionsProps) {
  if (!props.canReact) {
    return (
      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label={props.labels.reactionsReadOnlyLabel}>
        <span>{props.labels.agreeCount(props.scorePositive)}</span>
        <span aria-hidden="true">·</span>
        <span>{props.labels.disagreeCount(props.scoreNegative)}</span>
      </div>
    );
  }

  return (
    <div class="flex flex-wrap items-center gap-2" role="group" aria-label={props.labels.reactionsGroupLabel}>
      <ReactionForm
        commentId={props.commentId}
        emoji="👍"
        active={props.viewerReaction?.emoji === "👍"}
        reactionId={props.viewerReaction?.emoji === "👍" ? props.viewerReaction.reactionId : undefined}
        count={props.scorePositive}
        countLabel={props.labels.agreeCount(props.scorePositive)}
        actionLabel={props.labels.agreeAction}
        icon="heart"
        actionUrl={props.actionUrl}
        csrfToken={props.csrfToken}
        redirectTo={redirectTo}
      />
      <ReactionForm
        commentId={props.commentId}
        emoji="👎"
        active={props.viewerReaction?.emoji === "👎"}
        reactionId={props.viewerReaction?.emoji === "👎" ? props.viewerReaction.reactionId : undefined}
        count={props.scoreNegative}
        countLabel={props.labels.disagreeCount(props.scoreNegative)}
        actionLabel={props.labels.disagreeAction}
        icon="bolt"
        actionUrl={props.actionUrl}
        csrfToken={props.csrfToken}
        redirectTo={redirectTo}
      />
    </div>
  );
}
