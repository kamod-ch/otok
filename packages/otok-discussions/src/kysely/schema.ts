export const DISCUSSIONS_THREADS = "discussions_threads";
export const DISCUSSIONS_COMMENTS = "discussions_comments";
export const DISCUSSIONS_COMMENT_REVISIONS = "discussions_comment_revisions";
export const DISCUSSIONS_REACTIONS = "discussions_reactions";
export const DISCUSSIONS_REPORTS = "discussions_reports";
export const DISCUSSIONS_MODERATION_ACTIONS = "discussions_moderation_actions";
export const DISCUSSIONS_BLOCKS = "discussions_blocks";
export const DISCUSSIONS_NOTIFICATION_PREFS = "discussions_notification_prefs";

export interface DiscussionsThreadsTable {
  id: string;
  tenant_key: string;
  tenant_id: string;
  subject_type: string;
  subject_id: string;
  title: string;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  reply_count: number;
  pending_count: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  archived_at: string | null;
  pinned_at: string | null;
  pin_rank: number | null;
  row_version: number;
}

export interface DiscussionsCommentsTable {
  id: string;
  thread_id: string;
  tenant_key: string;
  subject_type: string;
  subject_id: string;
  author_id: string;
  parent_comment_id: string | null;
  root_comment_id: string | null;
  depth: number;
  status: string;
  body_markdown: string;
  body_html: string;
  revision: number;
  is_placeholder: number;
  score_positive: number;
  score_negative: number;
  highlighted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DiscussionsCommentRevisionsTable {
  id: string;
  comment_id: string;
  revision: number;
  body_markdown: string;
  edited_by_id: string;
  created_at: string;
}

export interface DiscussionsReactionsTable {
  id: string;
  comment_id: string;
  tenant_key: string;
  actor_id: string;
  emoji: string;
  created_at: string;
}

export interface DiscussionsReportsTable {
  id: string;
  tenant_key: string;
  subject_type: string;
  subject_id: string;
  target_type: string;
  target_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DiscussionsModerationActionsTable {
  id: string;
  tenant_key: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: string | null;
  created_at: string;
}

export interface DiscussionsBlocksTable {
  id: string;
  tenant_key: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface DiscussionsNotificationPrefsTable {
  tenant_id: string;
  user_id: string;
  reply_opt_in: number;
  mention_opt_in: number;
  updated_at: string;
}

export interface DiscussionsDatabase {
  discussions_threads: DiscussionsThreadsTable;
  discussions_comments: DiscussionsCommentsTable;
  discussions_comment_revisions: DiscussionsCommentRevisionsTable;
  discussions_reactions: DiscussionsReactionsTable;
  discussions_reports: DiscussionsReportsTable;
  discussions_moderation_actions: DiscussionsModerationActionsTable;
  discussions_blocks: DiscussionsBlocksTable;
  discussions_notification_prefs: DiscussionsNotificationPrefsTable;
}
