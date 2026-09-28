import type { CommentStatus, DiscussionThreadStatus } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";

const THREAD_TRANSITIONS: Record<DiscussionThreadStatus, readonly DiscussionThreadStatus[]> = {
  scheduled: ["open", "archived"],
  open: ["read_only", "closed", "archived"],
  read_only: ["open", "closed", "archived"],
  closed: ["open", "archived"],
  archived: [],
};

const COMMENT_TRANSITIONS: Record<CommentStatus, readonly CommentStatus[]> = {
  pending: ["published", "rejected", "hidden"],
  published: ["hidden", "deleted"],
  rejected: ["hidden", "deleted"],
  hidden: ["published", "deleted"],
  deleted: [],
};

export function assertThreadTransition(from: DiscussionThreadStatus, to: DiscussionThreadStatus): void {
  if (from === to) return;
  const allowed = THREAD_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new DiscussionError("INVALID_TRANSITION", `Thread cannot transition from ${from} to ${to}`);
  }
}

export function assertCommentTransition(from: CommentStatus, to: CommentStatus): void {
  if (from === to) return;
  const allowed = COMMENT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new DiscussionError("INVALID_TRANSITION", `Comment cannot transition from ${from} to ${to}`);
  }
}

export function canThreadTransition(from: DiscussionThreadStatus, to: DiscussionThreadStatus): boolean {
  if (from === to) return true;
  return THREAD_TRANSITIONS[from].includes(to);
}

export function canCommentTransition(from: CommentStatus, to: CommentStatus): boolean {
  if (from === to) return true;
  return COMMENT_TRANSITIONS[from].includes(to);
}

export function applyThreadTransition(
  status: DiscussionThreadStatus,
  to: DiscussionThreadStatus,
): DiscussionThreadStatus {
  assertThreadTransition(status, to);
  return to;
}

export function applyCommentTransition(status: CommentStatus, to: CommentStatus): CommentStatus {
  assertCommentTransition(status, to);
  return to;
}
