import type {
  ForumCategory,
  ForumModerationEvent,
  ForumPost,
  ForumPostRevision,
  ForumReaction,
  ForumReadState,
  ForumReport,
  ForumSubscription,
  ForumTag,
  ForumThread,
  ForumThreadStatus,
  ForumReportStatus,
} from "../types.js";
import type {
  ForumCategoryRow,
  ForumModerationEventsTable,
  ForumPostRow,
  ForumReportsTable,
  ForumTagsTable,
  ForumThreadRow,
} from "./schema.js";

export function rowToCategory(row: ForumCategoryRow): ForumCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    threadCount: row.thread_count,
    postCount: row.post_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToThread(row: ForumThreadRow): ForumThread {
  return {
    id: row.id,
    categoryId: row.category_id,
    authorId: row.author_id,
    title: row.title,
    slug: row.slug,
    status: row.status as ForumThreadStatus,
    isPinned: row.is_pinned === 1,
    viewCount: row.view_count,
    postCount: row.post_count,
    lastPostId: row.last_post_id,
    lastPostAt: row.last_post_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function rowToPost(row: ForumPostRow): ForumPost {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    parentPostId: row.parent_post_id,
    contentMarkdown: row.content_markdown,
    contentHtml: row.content_html,
    revision: row.revision,
    isHidden: row.is_hidden === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function rowToTag(row: ForumTagsTable): ForumTag {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    threadCount: row.thread_count,
    createdAt: row.created_at,
  };
}

export function rowToReport(row: ForumReportsTable): ForumReport {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    targetType: row.target_type as "thread" | "post",
    targetId: row.target_id,
    reason: row.reason,
    details: row.details ?? undefined,
    status: row.status as ForumReportStatus,
    reviewedById: row.reviewed_by_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToModerationEvent(row: ForumModerationEventsTable): ForumModerationEvent {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type as ForumModerationEvent["targetType"],
    targetId: row.target_id,
    reason: row.reason ?? undefined,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    createdAt: row.created_at,
  };
}

export function boolToInt(v: boolean): number {
  return v ? 1 : 0;
}

export function rowToReaction(row: {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}): ForumReaction {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

export function rowToSubscription(row: {
  id: string;
  thread_id: string;
  user_id: string;
  created_at: string;
}): ForumSubscription {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

export function rowToReadState(row: {
  id: string;
  thread_id: string;
  user_id: string;
  last_read_post_id: string | null;
  last_read_at: string;
}): ForumReadState {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    lastReadPostId: row.last_read_post_id,
    lastReadAt: row.last_read_at,
  };
}

export function rowToRevision(row: {
  id: string;
  post_id: string;
  revision: number;
  content_markdown: string;
  content_html: string;
  edited_by_id: string;
  created_at: string;
}): ForumPostRevision {
  return {
    id: row.id,
    postId: row.post_id,
    revision: row.revision,
    contentMarkdown: row.content_markdown,
    contentHtml: row.content_html,
    editedById: row.edited_by_id,
    createdAt: row.created_at,
  };
}
