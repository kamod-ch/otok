import type { CommentStatus, DiscussionActor, DiscussionComment } from "../types/domain.js";

export type CommentViewerRole = "public" | "author" | "moderator";

export function resolveCommentViewerRole(
  comment: DiscussionComment,
  actor: DiscussionActor | null,
  isModerator: boolean,
): CommentViewerRole {
  if (isModerator) return "moderator";
  if (actor && actor.id === comment.authorId) return "author";
  return "public";
}

/**
 * Visibility matrix:
 * - public: published; deleted placeholders only (no body leak)
 * - author: own pending/hidden/rejected/deleted; never other users' non-published
 * - moderator: full raw record
 */
export function isCommentVisibleToRole(comment: DiscussionComment, role: CommentViewerRole): boolean {
  if (role === "moderator") return true;
  if (role === "author") return true;
  if (comment.status === "published") return true;
  if (comment.status === "deleted" && comment.isPlaceholder) return true;
  return false;
}

export function projectCommentForRole(comment: DiscussionComment, role: CommentViewerRole): DiscussionComment | null {
  if (!isCommentVisibleToRole(comment, role)) return null;
  if (role === "moderator" || role === "author") return comment;
  if (comment.status === "published") return comment;
  if (comment.status === "deleted" && comment.isPlaceholder) {
    return {
      ...comment,
      bodyMarkdown: comment.bodyMarkdown,
      bodyHtml: "",
      authorId: comment.authorId,
    };
  }
  return null;
}

export function filterCommentsForRole(
  comments: DiscussionComment[],
  actor: DiscussionActor | null,
  isModerator: boolean,
): DiscussionComment[] {
  return comments
    .map((c) => projectCommentForRole(c, resolveCommentViewerRole(c, actor, isModerator)))
    .filter((c): c is DiscussionComment => c !== null);
}

export function publicListStatuses(): readonly CommentStatus[] {
  return ["published", "deleted"];
}
