import type { DiscussionSubject } from "../types/domain.js";

export const DISCUSSION_EVENT_VERSION = 1 as const;

export type DiscussionEventName =
  | "discussion.comment.created"
  | "discussion.comment.updated"
  | "discussion.comment.status_changed"
  | "discussion.reaction.changed"
  | "discussion.report.created"
  | "discussion.thread.status_changed";

export interface MinimalEventPayload {
  v: typeof DISCUSSION_EVENT_VERSION;
  commentId?: string;
  threadId?: string;
  authorId?: string;
  status?: string;
  /** Parent author for reply notifications — not emitted on public live SSE. */
  parentAuthorId?: string;
  /** Truncated markdown for @mention detection in notification bridge only. */
  mentionScanBody?: string;
  reactionEmoji?: string;
  reportId?: string;
  targetType?: string;
  targetId?: string;
  reasonCode?: string;
}

export function minimalCommentCreatedPayload(input: {
  commentId: string;
  threadId: string;
  authorId: string;
  status: string;
  parentAuthorId?: string;
  mentionScanBody?: string;
}): MinimalEventPayload {
  return {
    v: DISCUSSION_EVENT_VERSION,
    commentId: input.commentId,
    threadId: input.threadId,
    authorId: input.authorId,
    status: input.status,
    ...(input.parentAuthorId ? { parentAuthorId: input.parentAuthorId } : {}),
    ...(input.mentionScanBody ? { mentionScanBody: input.mentionScanBody } : {}),
  };
}

export function minimalCommentUpdatedPayload(input: {
  commentId: string;
  threadId: string;
  revision: number;
}): MinimalEventPayload {
  return {
    v: DISCUSSION_EVENT_VERSION,
    commentId: input.commentId,
    threadId: input.threadId,
    status: `rev:${input.revision}`,
  };
}

export function minimalStatusPayload(input: {
  commentId: string;
  threadId: string;
  status: string;
}): MinimalEventPayload {
  return {
    v: DISCUSSION_EVENT_VERSION,
    commentId: input.commentId,
    threadId: input.threadId,
    status: input.status,
  };
}

export function minimalReactionPayload(input: {
  commentId: string;
  threadId: string;
  reactionEmoji: string;
}): MinimalEventPayload {
  return {
    v: DISCUSSION_EVENT_VERSION,
    commentId: input.commentId,
    threadId: input.threadId,
    reactionEmoji: input.reactionEmoji,
  };
}

export function minimalReportPayload(input: {
  reportId: string;
  targetType: string;
  targetId: string;
  reasonCode: string;
}): MinimalEventPayload {
  return {
    v: DISCUSSION_EVENT_VERSION,
    reportId: input.reportId,
    targetType: input.targetType,
    targetId: input.targetId,
    reasonCode: input.reasonCode,
  };
}

export function subjectRef(subject: DiscussionSubject): DiscussionSubject {
  return {
    tenantId: subject.tenantId,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
  };
}
