import type { DiscussionStorePort } from "../adapters/discussion-store-port.js";
import type { CursorPage, DiscussionThread } from "../types/domain.js";
import type { ModerationQueueItem, ModerationQueueQuery } from "../types/moderation.js";

function queueKindForComment(
  status: string,
  openReportCount: number,
  queueKind: ModerationQueueQuery["queueKind"],
): ModerationQueueItem["queueKind"] | null {
  const pending = status === "pending";
  const reported = openReportCount > 0;
  if (queueKind === "pending" && pending) return "pending";
  if (queueKind === "reported" && reported) return "reported";
  if (queueKind === "auto_flagged" && pending) return "auto_flagged";
  if (queueKind === "all" && (pending || reported)) {
    if (reported) return "reported";
    return pending ? "auto_flagged" : "pending";
  }
  if (!queueKind || queueKind === "all") {
    if (reported) return "reported";
    if (pending) return "auto_flagged";
  }
  return null;
}

export async function listModerationQueueFromStore(
  store: DiscussionStorePort,
  query: ModerationQueueQuery,
  threadsById: Map<string, DiscussionThread>,
  nowMs: number,
): Promise<CursorPage<ModerationQueueItem>> {
  const limit = Math.min(query.limit ?? 25, 100);
  const openReports = await store.listOpenReportsForTenant(query.tenantId);
  const reportsByComment = new Map<string, { count: number; latestReason?: string }>();
  for (const report of openReports) {
    if (report.targetType !== "comment") continue;
    const entry = reportsByComment.get(report.targetId) ?? { count: 0, latestReason: report.reason };
    entry.count += 1;
    entry.latestReason = report.reason;
    reportsByComment.set(report.targetId, entry);
  }

  let comments = await store.listCommentsByTenant(query.tenantId);
  if (query.subjectType) comments = comments.filter((c) => c.subject.subjectType === query.subjectType);
  if (query.subjectId) comments = comments.filter((c) => c.subject.subjectId === query.subjectId);
  if (query.threadId) comments = comments.filter((c) => c.threadId === query.threadId);
  if (query.authorId) comments = comments.filter((c) => c.authorId === query.authorId);
  if (query.statuses?.length) {
    const allowed = new Set(query.statuses);
    comments = comments.filter((c) => allowed.has(c.status));
  }

  const kind = query.queueKind ?? "all";
  const items: ModerationQueueItem[] = [];
  for (const comment of comments) {
    const reportMeta = reportsByComment.get(comment.id);
    const openReportCount = reportMeta?.count ?? 0;
    if (query.minReportCount && openReportCount < query.minReportCount) continue;
    if (query.reportReason && !reportMeta?.latestReason?.includes(query.reportReason)) continue;

    const ageHours = (nowMs - Date.parse(comment.createdAt)) / 3_600_000;
    if (query.minAgeHours !== undefined && ageHours < query.minAgeHours) continue;
    if (query.maxAgeHours !== undefined && ageHours > query.maxAgeHours) continue;

    const resolvedKind = queueKindForComment(comment.status, openReportCount, kind);
    if (!resolvedKind) continue;

    const thread = threadsById.get(comment.threadId);
    items.push({
      commentId: comment.id,
      threadId: comment.threadId,
      subject: comment.subject,
      authorId: comment.authorId,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      queueKind: resolvedKind,
      openReportCount,
      latestReportReason: reportMeta?.latestReason,
      threadTitle: thread?.title,
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.commentId.localeCompare(a.commentId));

  let start = 0;
  if (query.cursor) {
    const idx = items.findIndex((i) => i.commentId === query.cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const page = items.slice(start, start + limit);
  return {
    items: page,
    nextCursor: start + limit < items.length ? page[page.length - 1]?.commentId : undefined,
  };
}
