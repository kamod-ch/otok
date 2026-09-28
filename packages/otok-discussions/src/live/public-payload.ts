import { z } from "zod";
import type { DiscussionDomainEvent } from "../types/ports.js";

/** Public live payload — references only; clients reload via authorized HTTP. */
export const discussionLiveEventSchema = z.object({
  v: z.literal(1),
  name: z.enum([
    "discussion.comment.created",
    "discussion.comment.updated",
    "discussion.reaction.changed",
    "discussion.thread.status_changed",
  ]),
  tenantId: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  threadId: z.string(),
  commentId: z.string().optional(),
  occurredAt: z.string(),
});

export type DiscussionLiveEvent = z.infer<typeof discussionLiveEventSchema>;

const PUBLIC_EVENT_NAMES = new Set<string>([
  "discussion.comment.created",
  "discussion.comment.updated",
  "discussion.reaction.changed",
  "discussion.thread.status_changed",
]);

export function toDiscussionLiveEvent(event: DiscussionDomainEvent): DiscussionLiveEvent | null {
  if (!PUBLIC_EVENT_NAMES.has(event.name)) return null;

  const payload = event.payload;
  const threadId = typeof payload.threadId === "string" ? payload.threadId : "";
  if (!threadId) return null;

  if (event.name === "discussion.comment.created" || event.name === "discussion.comment.updated") {
    const status = typeof payload.status === "string" ? payload.status : "";
    if (status.startsWith("rev:")) {
      /* comment.updated */
    } else if (status !== "published") {
      return null;
    }
  }

  if (event.name === "discussion.report.created") return null;

  const commentId = typeof payload.commentId === "string" ? payload.commentId : undefined;

  return {
    v: 1,
    name: event.name as DiscussionLiveEvent["name"],
    tenantId: event.tenantId,
    subjectType: event.subject.subjectType,
    subjectId: event.subject.subjectId,
    threadId,
    commentId,
    occurredAt: event.occurredAt,
  };
}
