import type { CommentRevision, DiscussionComment, DiscussionThread, Reaction, Report } from "../types/domain.js";
import type {
  DiscussionsCommentRevisionsTable,
  DiscussionsCommentsTable,
  DiscussionsReactionsTable,
  DiscussionsReportsTable,
  DiscussionsThreadsTable,
} from "./schema.js";
import { encodeTenantKey, subjectFromRow } from "./tenant.js";

export function rowToThread(row: DiscussionsThreadsTable): DiscussionThread {
  return {
    id: row.id,
    subject: subjectFromRow(row),
    title: row.title,
    status: row.status as DiscussionThread["status"],
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    replyCount: row.reply_count,
    pendingCount: row.pending_count,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    archivedAt: row.archived_at,
    pinnedAt: row.pinned_at,
    pinRank: row.pin_rank,
  };
}

export function threadToInsertRow(thread: DiscussionThread): Omit<DiscussionsThreadsTable, "row_version"> & {
  row_version: number;
} {
  return {
    id: thread.id,
    tenant_key: encodeTenantKey(thread.subject.tenantId),
    tenant_id: thread.subject.tenantId,
    subject_type: thread.subject.subjectType,
    subject_id: thread.subject.subjectId,
    title: thread.title,
    status: thread.status,
    opens_at: thread.opensAt,
    closes_at: thread.closesAt,
    reply_count: thread.replyCount,
    pending_count: thread.pendingCount,
    created_by_id: thread.createdById,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
    closed_at: thread.closedAt,
    archived_at: thread.archivedAt,
    pinned_at: thread.pinnedAt,
    pin_rank: thread.pinRank,
    row_version: 1,
  };
}

export function rowToComment(row: DiscussionsCommentsTable): DiscussionComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    subject: subjectFromRow(row),
    authorId: row.author_id,
    parentCommentId: row.parent_comment_id,
    status: row.status as DiscussionComment["status"],
    depth: row.depth,
    bodyMarkdown: row.body_markdown,
    bodyHtml: row.body_html,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    isPlaceholder: row.is_placeholder === 1,
    scorePositive: row.score_positive,
    scoreNegative: row.score_negative,
    highlightedAt: row.highlighted_at,
  };
}

export function commentToInsertRow(comment: DiscussionComment, rootCommentId: string | null): DiscussionsCommentsTable {
  return {
    id: comment.id,
    thread_id: comment.threadId,
    tenant_key: encodeTenantKey(comment.subject.tenantId),
    subject_type: comment.subject.subjectType,
    subject_id: comment.subject.subjectId,
    author_id: comment.authorId,
    parent_comment_id: comment.parentCommentId,
    root_comment_id: rootCommentId,
    depth: comment.depth,
    status: comment.status,
    body_markdown: comment.bodyMarkdown,
    body_html: comment.bodyHtml,
    revision: comment.revision,
    is_placeholder: comment.isPlaceholder ? 1 : 0,
    score_positive: comment.scorePositive,
    score_negative: comment.scoreNegative,
    highlighted_at: comment.highlightedAt,
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
    deleted_at: comment.deletedAt,
  };
}

export function rowToRevision(row: DiscussionsCommentRevisionsTable): CommentRevision {
  return {
    id: row.id,
    commentId: row.comment_id,
    revision: row.revision,
    bodyMarkdown: row.body_markdown,
    editedById: row.edited_by_id,
    createdAt: row.created_at,
  };
}

export function rowToReaction(row: DiscussionsReactionsTable): Reaction {
  return {
    id: row.id,
    commentId: row.comment_id,
    actorId: row.actor_id,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

export function rowToReport(row: DiscussionsReportsTable): Report {
  return {
    id: row.id,
    subject: subjectFromRow(row),
    targetType: row.target_type as Report["targetType"],
    targetId: row.target_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    details: row.details ?? undefined,
    status: row.status as Report["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
