import type { CommentSort, DiscussionComment, DiscussionSubject } from "../types/domain.js";
import type { DiscussionsContextState } from "../http/types.js";
import type { DiscussionRequestContext } from "../services/types.js";
import { enrichCommentItems, type EnrichedCommentItem } from "./enrich-comments.js";
import { resolveCommentPermissions } from "../ui/comment-permissions.js";
import { discussionsPermalinkUrl, discussionsRepliesUrl } from "../ui/thread-url.js";
import { threadAllowsComments } from "../ui/thread-policy.js";

export interface CommentTreeNode extends EnrichedCommentItem {
  depth: number;
  parentCommentId: string | null;
  revision: number;
  directReplyCount: number;
  moreDirectRepliesAvailable: boolean;
  replies: CommentTreeNode[];
  viewerReaction?: { emoji: "👍" | "👎"; reactionId?: string } | null;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canReply: boolean;
    canReport: boolean;
  };
  permalinkUrl: string;
  showAllRepliesUrl?: string;
}

async function viewerReactionForComment(
  state: DiscussionsContextState,
  subject: DiscussionSubject,
  commentId: string,
  viewerUserId?: string,
): Promise<CommentTreeNode["viewerReaction"]> {
  if (!viewerUserId || !state.services) return null;
  const read = state.options.adapter.read;
  if (!read?.listReactions) return null;
  const reactions = await read.listReactions(subject, commentId);
  const mine = reactions.find((r) => r.actorId === viewerUserId);
  if (!mine) return null;
  const emoji = mine.emoji === "👍" || mine.emoji === "👎" ? mine.emoji : null;
  if (!emoji) return null;
  return { emoji, reactionId: mine.id };
}

async function buildNode(
  state: DiscussionsContextState,
  reqCtx: DiscussionRequestContext,
  subject: DiscussionSubject,
  threadId: string,
  comment: DiscussionComment,
  options: {
    maxDepth: number;
    previewLimit: number;
    sort: CommentSort;
    basePath: string;
    subjectId: string;
    nowIso: string;
    isModerator: boolean;
    threadStatus: import("../types/domain.js").DiscussionThreadStatus;
  },
): Promise<CommentTreeNode> {
  const [enriched] = await enrichCommentItems(state, [comment]);
  const enrichedItem = enriched!;
  const viewerUserId = reqCtx.sessionUserId ?? undefined;
  const permissions = resolveCommentPermissions({
    comment,
    viewerUserId,
    isModerator: options.isModerator,
    threadAllowsMutation: threadAllowsComments(options.threadStatus),
    maxDepth: options.maxDepth,
    rules: state.options.runtime.rules,
    nowIso: options.nowIso,
  });

  let directReplyCount = 0;
  let moreDirectRepliesAvailable = false;
  if (comment.depth < options.maxDepth) {
    const countPage = await state.services.comments.listComments(reqCtx, {
      threadId,
      replyToCommentId: comment.id,
      limit: 200,
      sort: "oldest",
    });
    directReplyCount = countPage.items.length;
    moreDirectRepliesAvailable = Boolean(countPage.nextCursor) || directReplyCount > options.previewLimit;
  }

  let replies: CommentTreeNode[] = [];
  if (comment.depth < options.maxDepth && directReplyCount > 0) {
    const replyPage = await state.services.comments.listComments(reqCtx, {
      threadId,
      replyToCommentId: comment.id,
      limit: options.previewLimit,
      sort: "oldest",
    });
    replies = await Promise.all(
      replyPage.items.map((child) =>
        buildNode(state, reqCtx, subject, threadId, child, {
          ...options,
          previewLimit: options.previewLimit,
        }),
      ),
    );
  }

  return {
    ...enrichedItem,
    depth: comment.depth,
    parentCommentId: comment.parentCommentId,
    revision: comment.revision,
    directReplyCount,
    replies,
    viewerReaction: await viewerReactionForComment(state, subject, comment.id, viewerUserId),
    permissions,
    permalinkUrl: discussionsPermalinkUrl(options.basePath, options.subjectId, comment.id),
    moreDirectRepliesAvailable,
    showAllRepliesUrl:
      moreDirectRepliesAvailable || directReplyCount > replies.length
        ? discussionsRepliesUrl(options.basePath, options.subjectId, comment.id)
        : undefined,
  };
}

export async function buildCommentTreeForRoots(
  state: DiscussionsContextState,
  reqCtx: DiscussionRequestContext,
  subject: DiscussionSubject,
  threadId: string,
  roots: DiscussionComment[],
  options: {
    maxDepth: number;
    previewLimit: number;
    sort: CommentSort;
    basePath: string;
    subjectId: string;
    threadStatus: import("../types/domain.js").DiscussionThreadStatus;
    isModerator: boolean;
  },
): Promise<CommentTreeNode[]> {
  const now = state.options.runtime.deps.clock.now();
  const nowIso = typeof now === "string" ? now : now.toISOString();
  return Promise.all(
    roots.map((root) =>
      buildNode(state, reqCtx, subject, threadId, root, {
        ...options,
        nowIso,
      }),
    ),
  );
}
