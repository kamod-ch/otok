export {
  createDiscussionsI18n,
  pickDiscussionLocale,
  DISCUSSION_LOCALES,
  type DiscussionLocale,
  type DiscussionsI18n,
  type DiscussionMessageKey,
} from "./create.js";
export type { DiscussionMessageSchema } from "./schema.js";
export { discussionLabelsFromI18n } from "./labels.js";
export { formatCommentDateTime, formatCommentRelativeTime } from "./format-time.js";
export { discussionMessagesDe } from "./messages/de.js";
export { discussionMessagesEn } from "./messages/en.js";
