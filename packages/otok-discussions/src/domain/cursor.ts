import type { CommentSort, DiscussionSubject } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";

export const CURSOR_VERSION = 1 as const;

export interface CommentCursorAnchor {
  id: string;
  createdAt: string;
  /** Present when sort is `top`. */
  score?: number;
}

export interface CommentListCursorPayload {
  v: typeof CURSOR_VERSION;
  sort: CommentSort;
  tenantId: string;
  subjectType: string;
  subjectId: string;
  threadId: string;
  anchor: CommentCursorAnchor;
}

export interface EncodeCommentCursorInput {
  sort: CommentSort;
  subject: DiscussionSubject;
  threadId: string;
  anchor: CommentCursorAnchor;
}

function toBase64Url(json: string): string {
  return Buffer.from(json, "utf8").toString("base64url");
}

function fromBase64Url(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

export function encodeCommentCursor(input: EncodeCommentCursorInput): string {
  if (input.sort === "top" && typeof input.anchor.score !== "number") {
    throw new DiscussionError("INVALID_INPUT", "Top sort cursors require anchor.score");
  }
  if (input.sort !== "top" && input.anchor.score !== undefined) {
    throw new DiscussionError("INVALID_INPUT", "anchor.score is only valid for top sort");
  }
  const payload: CommentListCursorPayload = {
    v: CURSOR_VERSION,
    sort: input.sort,
    tenantId: input.subject.tenantId,
    subjectType: input.subject.subjectType,
    subjectId: input.subject.subjectId,
    threadId: input.threadId,
    anchor: input.anchor,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeCommentCursor(raw: string): CommentListCursorPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(raw));
  } catch {
    throw new DiscussionError("INVALID_CURSOR", "Cursor is not valid base64url JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new DiscussionError("INVALID_CURSOR", "Cursor payload must be an object");
  }
  const p = parsed as Partial<CommentListCursorPayload>;
  if (p.v !== CURSOR_VERSION) {
    throw new DiscussionError("INVALID_CURSOR", `Unsupported cursor version ${String(p.v)}`);
  }
  if (p.sort !== "newest" && p.sort !== "oldest" && p.sort !== "top") {
    throw new DiscussionError("INVALID_CURSOR", "Cursor sort must be newest, oldest, or top");
  }
  if (!p.tenantId || !p.subjectType || !p.subjectId || !p.threadId || !p.anchor?.id || !p.anchor?.createdAt) {
    throw new DiscussionError("INVALID_CURSOR", "Cursor is missing required scope fields");
  }
  if (p.sort === "top" && typeof p.anchor.score !== "number") {
    throw new DiscussionError("INVALID_CURSOR", "Top sort cursors must include anchor.score");
  }
  if (p.sort !== "top" && p.anchor.score !== undefined) {
    throw new DiscussionError("INVALID_CURSOR", "Only top sort cursors may include anchor.score");
  }
  return p as CommentListCursorPayload;
}

export function assertCommentCursorScope(
  cursor: CommentListCursorPayload,
  subject: DiscussionSubject,
  threadId: string,
  sort: CommentSort,
): void {
  if (cursor.sort !== sort) {
    throw new DiscussionError("INVALID_CURSOR", "Cursor sort does not match request sort");
  }
  if (
    cursor.tenantId !== subject.tenantId ||
    cursor.subjectType !== subject.subjectType ||
    cursor.subjectId !== subject.subjectId
  ) {
    throw new DiscussionError("INVALID_CURSOR", "Cursor subject scope does not match request");
  }
  if (cursor.threadId !== threadId) {
    throw new DiscussionError("INVALID_CURSOR", "Cursor thread scope does not match request");
  }
}
