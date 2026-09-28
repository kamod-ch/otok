import type { CommentSort } from "../types/domain.js";

export interface ThreadUrlOptions {
  sort?: CommentSort;
  cursor?: string;
  report?: string;
  edit?: string;
  focus?: string;
  reportAck?: boolean;
}

export function discussionsPermalinkUrl(basePath: string, subjectId: string, commentId: string): string {
  return `${normalize(basePath)}/${encodeURIComponent(subjectId)}/comment/${encodeURIComponent(commentId)}`;
}

export function discussionsRepliesUrl(basePath: string, subjectId: string, parentCommentId: string): string {
  return `${normalize(basePath)}/${encodeURIComponent(subjectId)}/replies/${encodeURIComponent(parentCommentId)}`;
}

export function discussionsThreadViewUrl(basePath: string, subjectId: string, options: ThreadUrlOptions = {}): string {
  const base = `${normalize(basePath)}/${encodeURIComponent(subjectId)}/thread`;
  const params = new URLSearchParams();
  if (options.sort && options.sort !== "newest") params.set("sort", options.sort);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.report) params.set("report", options.report);
  if (options.edit) params.set("edit", options.edit);
  if (options.focus) params.set("focus", options.focus);
  if (options.reportAck) params.set("reportAck", "1");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function threadCommentHash(commentId: string): string {
  return `#comment-${commentId}`;
}

function normalize(basePath: string): string {
  return basePath.replace(/\/+$/, "") || "/discussions";
}
