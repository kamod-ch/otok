import type {
  CommentStatus,
  DiscussionComment,
  DiscussionThread,
  DiscussionThreadStatus,
  ModerationMode,
} from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";

export interface DiscussionRulesConfig {
  maxCommentLength: number;
  maxThreadTitleLength: number;
  maxDepth: number;
  editWindowMs: number;
  moderationMode: ModerationMode;
  trustedRole: string;
  deletedParentPlaceholder: string;
}

export function resolveEffectiveThreadStatus(thread: DiscussionThread, nowIso: string): DiscussionThreadStatus {
  const now = Date.parse(nowIso);
  if (thread.status === "scheduled") {
    if (thread.opensAt && Date.parse(thread.opensAt) <= now) {
      return "open";
    }
    return "scheduled";
  }
  if (thread.status === "open" && thread.closesAt && Date.parse(thread.closesAt) <= now) {
    return "closed";
  }
  return thread.status;
}

export function assertThreadAcceptsReplies(thread: DiscussionThread, nowIso: string): void {
  const effective = resolveEffectiveThreadStatus(thread, nowIso);
  if (effective === "scheduled") {
    throw new DiscussionError("FORBIDDEN", "Thread is not open yet");
  }
  if (effective === "read_only") {
    throw new DiscussionError("FORBIDDEN", "Thread is read-only");
  }
  if (effective === "closed" || effective === "archived") {
    throw new DiscussionError("FORBIDDEN", "Thread is closed");
  }
}

export function assertBodyLength(body: string, maxLength: number, label: string): void {
  if (body.length > maxLength) {
    throw new DiscussionError("INVALID_INPUT", `${label} exceeds maximum length of ${maxLength}`);
  }
  if (body.trim().length === 0) {
    throw new DiscussionError("INVALID_INPUT", `${label} must not be empty`);
  }
}

export function resolveInitialCommentStatus(
  mode: ModerationMode,
  actorRoles: readonly string[],
  trustedRole: string,
): CommentStatus {
  if (mode === "pre") return "pending";
  if (mode === "trusted" && actorRoles.includes(trustedRole)) return "published";
  return "published";
}

export function assertCommentDepth(parentDepth: number | null, maxDepth: number): number {
  const depth = (parentDepth ?? -1) + 1;
  if (depth > maxDepth) {
    throw new DiscussionError("FORBIDDEN", `Maximum reply depth of ${maxDepth} exceeded`);
  }
  return depth;
}

export function assertEditWindow(comment: DiscussionComment, nowIso: string, editWindowMs: number): void {
  if (comment.status === "deleted") {
    throw new DiscussionError("FORBIDDEN", "Deleted comments cannot be edited");
  }
  const elapsed = Date.parse(nowIso) - Date.parse(comment.createdAt);
  if (elapsed > editWindowMs) {
    throw new DiscussionError("FORBIDDEN", "Edit window has expired");
  }
}

export function isCommentVisibleInThread(status: CommentStatus): boolean {
  return status === "published" || status === "pending" || status === "hidden";
}

export function placeholderForDeletedParent(
  config: DiscussionRulesConfig,
): Pick<DiscussionComment, "bodyMarkdown" | "bodyHtml" | "isPlaceholder" | "status"> {
  return {
    bodyMarkdown: config.deletedParentPlaceholder,
    bodyHtml: "",
    isPlaceholder: true,
    status: "published",
  };
}

export function countDeltaForCommentStatus(
  from: CommentStatus,
  to: CommentStatus,
): {
  reply: number;
  pending: number;
} {
  const replyVisible = (s: CommentStatus) => s === "published" || s === "pending" || s === "hidden";
  let reply = 0;
  let pending = 0;
  if (replyVisible(from) && !replyVisible(to)) reply -= 1;
  if (!replyVisible(from) && replyVisible(to)) reply += 1;
  if (from === "pending" && to !== "pending") pending -= 1;
  if (from !== "pending" && to === "pending") pending += 1;
  return { reply, pending };
}
