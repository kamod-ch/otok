import { renderSafeDiscussionMarkdownHtml } from "./markdown-render.js";
import {
  normalizeCommentBody,
  validateCommentBodyNormalized,
  type ProcessCommentBodyOptions,
  type ProcessedCommentBody,
} from "./content.js";

export function processCommentBodyForStorage(raw: string, options: ProcessCommentBodyOptions): ProcessedCommentBody {
  const bodyMarkdown = normalizeCommentBody(raw);
  validateCommentBodyNormalized(bodyMarkdown, options);
  const bodyHtml = renderSafeDiscussionMarkdownHtml(bodyMarkdown);
  return { bodyMarkdown, bodyHtml };
}
