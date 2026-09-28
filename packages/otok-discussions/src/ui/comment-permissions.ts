import type { DiscussionComment } from "../types/domain.js";
import type { DiscussionRulesConfig } from "../domain/rules.js";
import { assertEditWindow } from "../domain/rules.js";

export interface CommentPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canReply: boolean;
  canReport: boolean;
}

export function resolveCommentPermissions(input: {
  comment: Pick<DiscussionComment, "authorId" | "status" | "isPlaceholder" | "depth" | "createdAt">;
  viewerUserId?: string;
  isModerator: boolean;
  threadAllowsMutation: boolean;
  maxDepth: number;
  rules: Pick<DiscussionRulesConfig, "editWindowMs">;
  nowIso: string;
}): CommentPermissions {
  const isAuthor = Boolean(input.viewerUserId && input.comment.authorId === input.viewerUserId);
  const published = input.comment.status === "published" && !input.comment.isPlaceholder;

  let canEdit = false;
  if (input.threadAllowsMutation && isAuthor && input.comment.status === "published") {
    try {
      assertEditWindow(input.comment as DiscussionComment, input.nowIso, input.rules.editWindowMs);
      canEdit = true;
    } catch {
      canEdit = false;
    }
  }

  const canDelete =
    input.threadAllowsMutation &&
    (isAuthor || input.isModerator) &&
    (input.comment.status === "published" || input.comment.status === "pending");

  const canReply =
    input.threadAllowsMutation &&
    published &&
    input.comment.depth < input.maxDepth;

  const canReport = Boolean(input.viewerUserId) && published;

  return { canEdit, canDelete, canReply, canReport };
}
