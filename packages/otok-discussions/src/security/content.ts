import { DiscussionError } from "../types/errors.js";
import { isAllowedDiscussionUrl } from "./urls.js";

/** Strip bidi override / isolate controls used for UI spoofing. */
const BIDI_CONTROL = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g;

/** Detect HTML-like markup (storage rejects; no arbitrary fragments). */
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/;

export interface ProcessCommentBodyOptions {
  maxCodePoints: number;
  /** When true, reject bodies containing HTML tags instead of stripping. */
  rejectHtml?: boolean;
}

export interface ProcessedCommentBody {
  bodyMarkdown: string;
  bodyHtml: string;
}

export function normalizeCommentBody(raw: string): string {
  let text = raw.normalize("NFC");
  text = text.replace(/\0/g, "");
  text = text.replace(BIDI_CONTROL, "");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return text.trim();
}

export function countUnicodeCodePoints(text: string): number {
  return [...text].length;
}

function assertNoHtml(text: string): void {
  if (HTML_TAG.test(text)) {
    throw new DiscussionError("INVALID_INPUT", "HTML markup is not allowed in comments");
  }
}

function assertMarkdownLinksSafe(text: string): void {
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(text)) !== null) {
    const href = match[2]!.trim();
    if (!isAllowedDiscussionUrl(href)) {
      throw new DiscussionError("INVALID_INPUT", "Link URL is not allowed");
    }
  }
  const autolinkPattern = /(?<![([])(https?:\/\/[^\s<>\])]+)/gi;
  while ((match = autolinkPattern.exec(text)) !== null) {
    if (!isAllowedDiscussionUrl(match[0]!)) {
      throw new DiscussionError("INVALID_INPUT", "Link URL is not allowed");
    }
  }
}

export function validateCommentBodyNormalized(text: string, options: ProcessCommentBodyOptions): void {
  if (text.length === 0) {
    throw new DiscussionError("INVALID_INPUT", "Comment must not be empty");
  }
  const points = countUnicodeCodePoints(text);
  if (points > options.maxCodePoints) {
    throw new DiscussionError(
      "INVALID_INPUT",
      `Comment exceeds maximum length of ${options.maxCodePoints} characters`,
    );
  }
  if (options.rejectHtml !== false) {
    assertNoHtml(text);
  }
  assertMarkdownLinksSafe(text);
}
