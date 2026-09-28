import type { Kysely } from "kysely";
import {
  commentRankingScore,
  decodeCommentCursor,
  encodeCommentCursor,
  assertCommentCursorScope,
} from "../domain/index.js";
import type { CommentSort, CommentStatus, CursorPage, DiscussionComment, DiscussionSubject } from "../types/domain.js";
import type { ListCommentsQuery } from "../types/ports.js";
import { rowToComment } from "./mappers.js";
import type { DiscussionsDatabase } from "./schema.js";
import { subjectScopeKey } from "./tenant.js";

function applyCursor<T extends DiscussionComment>(
  items: T[],
  sort: CommentSort,
  cursor: string | undefined,
  subject: DiscussionSubject,
  threadId: string,
): T[] {
  if (!cursor) return items;
  const decoded = decodeCommentCursor(cursor);
  assertCommentCursorScope(decoded, subject, threadId, sort);
  const idx = items.findIndex((c) => {
    if (c.id !== decoded.anchor.id) return false;
    if (sort === "top") return commentRankingScore(c) === decoded.anchor.score;
    return c.createdAt === decoded.anchor.createdAt;
  });
  return idx >= 0 ? items.slice(idx + 1) : items;
}

export async function listCommentsPage(
  db: Kysely<DiscussionsDatabase>,
  query: ListCommentsQuery,
  defaultLimit: number,
): Promise<CursorPage<DiscussionComment>> {
  const sort: CommentSort = query.sort ?? "newest";
  const limit = Math.min(query.limit ?? defaultLimit, 100);
  const scope = subjectScopeKey(query.subject);

  let qb = db
    .selectFrom("discussions_comments")
    .selectAll()
    .where("thread_id", "=", query.threadId)
    .where("tenant_key", "=", scope.tenant_key)
    .where("subject_type", "=", scope.subject_type)
    .where("subject_id", "=", scope.subject_id);

  if (query.rootsOnly) {
    qb = qb.where("depth", "=", 0);
  } else if (query.replyToCommentId) {
    qb = qb.where("parent_comment_id", "=", query.replyToCommentId);
  }

  if (query.statuses?.length) {
    qb = qb.where("status", "in", [...query.statuses]);
  }

  if (sort === "newest") {
    qb = qb.orderBy("created_at desc").orderBy("id desc");
  } else if (sort === "oldest") {
    qb = qb.orderBy("created_at asc").orderBy("id asc");
  } else {
    qb = qb.orderBy("score_positive desc").orderBy("score_negative asc").orderBy("created_at desc").orderBy("id desc");
  }

  const fetchLimit = limit + 1 + (query.cursor ? 50 : 0);
  const rows = await qb.limit(fetchLimit).execute();
  let items = rows.map(rowToComment);
  items = applyCursor(items, sort, query.cursor, query.subject, query.threadId);
  const page = items.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor =
    items.length > limit && last
      ? encodeCommentCursor({
          sort,
          subject: query.subject,
          threadId: query.threadId,
          anchor: {
            id: last.id,
            createdAt: last.createdAt,
            ...(sort === "top" ? { score: commentRankingScore(last) } : {}),
          },
        })
      : undefined;
  return { items: page, nextCursor };
}

/** Batch-load direct replies for many root comments (avoids N+1 in previews). */
export async function listReplyPreviewsByParents(
  db: Kysely<DiscussionsDatabase>,
  subject: DiscussionSubject,
  threadId: string,
  parentIds: readonly string[],
  options: { limitPerParent: number; statuses?: readonly CommentStatus[] },
): Promise<Map<string, DiscussionComment[]>> {
  const result = new Map<string, DiscussionComment[]>();
  if (!parentIds.length) return result;
  const scope = subjectScopeKey(subject);
  const limitPer = Math.min(options.limitPerParent, 20);

  for (const parentId of parentIds) {
    let qb = db
      .selectFrom("discussions_comments")
      .selectAll()
      .where("thread_id", "=", threadId)
      .where("parent_comment_id", "=", parentId)
      .where("tenant_key", "=", scope.tenant_key)
      .where("subject_type", "=", scope.subject_type)
      .where("subject_id", "=", scope.subject_id)
      .orderBy("created_at asc")
      .orderBy("id asc")
      .limit(limitPer);
    if (options.statuses?.length) {
      qb = qb.where("status", "in", [...options.statuses]);
    }
    const rows = await qb.execute();
    result.set(parentId, rows.map(rowToComment));
  }
  return result;
}
