export type DiscussionsDialect = "sqlite" | "postgres";

export const DISCUSSIONS_MIGRATION_ID = "20260926120000_discussions_initial";

const SHARED_UP = `
CREATE TABLE IF NOT EXISTS discussions_threads (
  id TEXT PRIMARY KEY,
  tenant_key TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT '',
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  opens_at TEXT,
  closes_at TEXT,
  reply_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT,
  archived_at TEXT,
  pinned_at TEXT,
  pin_rank INTEGER,
  row_version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_discussions_threads_subject_updated
  ON discussions_threads(tenant_key, subject_type, subject_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_threads_subject_status_created
  ON discussions_threads(tenant_key, subject_type, subject_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS discussions_comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES discussions_threads(id) ON DELETE CASCADE,
  tenant_key TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  parent_comment_id TEXT REFERENCES discussions_comments(id),
  root_comment_id TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  is_placeholder INTEGER NOT NULL DEFAULT 0,
  score_positive INTEGER NOT NULL DEFAULT 0,
  score_negative INTEGER NOT NULL DEFAULT 0,
  highlighted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (
    (depth = 0 AND parent_comment_id IS NULL)
    OR (depth > 0 AND parent_comment_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_discussions_comments_thread_status_created
  ON discussions_comments(thread_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_comments_parent_status_created
  ON discussions_comments(parent_comment_id, status, created_at DESC, id DESC)
  WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussions_comments_roots
  ON discussions_comments(thread_id, status, created_at DESC, id DESC)
  WHERE depth = 0;
CREATE INDEX IF NOT EXISTS idx_discussions_comments_ranking
  ON discussions_comments(thread_id, score_positive DESC, score_negative ASC, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_comments_subject
  ON discussions_comments(tenant_key, subject_type, subject_id, thread_id);

CREATE TABLE IF NOT EXISTS discussions_comment_revisions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES discussions_comments(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  body_markdown TEXT NOT NULL,
  edited_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_discussions_comment_revisions_comment
  ON discussions_comment_revisions(comment_id, revision DESC);

CREATE TABLE IF NOT EXISTS discussions_reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES discussions_comments(id) ON DELETE CASCADE,
  tenant_key TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_discussions_reactions_actor_comment
  ON discussions_reactions(comment_id, actor_id);

CREATE TABLE IF NOT EXISTS discussions_reports (
  id TEXT PRIMARY KEY,
  tenant_key TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_discussions_reports_open_dedupe
  ON discussions_reports(tenant_key, target_type, target_id, reporter_id)
  WHERE status IN ('open', 'reviewing');
CREATE INDEX IF NOT EXISTS idx_discussions_reports_open
  ON discussions_reports(tenant_key, status, created_at DESC)
  WHERE status IN ('open', 'reviewing');

CREATE TABLE IF NOT EXISTS discussions_moderation_actions (
  id TEXT PRIMARY KEY,
  tenant_key TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_discussions_moderation_actions_tenant_time
  ON discussions_moderation_actions(tenant_key, created_at DESC);

CREATE TABLE IF NOT EXISTS discussions_blocks (
  id TEXT PRIMARY KEY,
  tenant_key TEXT NOT NULL,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_discussions_blocks_pair
  ON discussions_blocks(tenant_key, blocker_id, blocked_id);

CREATE TABLE IF NOT EXISTS discussions_notification_prefs (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reply_opt_in INTEGER NOT NULL DEFAULT 0,
  mention_opt_in INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);
`;

const SHARED_DOWN = `
DROP TABLE IF EXISTS discussions_notification_prefs;
DROP TABLE IF EXISTS discussions_blocks;
DROP TABLE IF EXISTS discussions_moderation_actions;
DROP TABLE IF EXISTS discussions_reports;
DROP TABLE IF EXISTS discussions_reactions;
DROP TABLE IF EXISTS discussions_comment_revisions;
DROP TABLE IF EXISTS discussions_comments;
DROP TABLE IF EXISTS discussions_threads;
`;

export const DISCUSSIONS_SQLITE_UP = SHARED_UP;
export const DISCUSSIONS_POSTGRES_UP = SHARED_UP;
export const DISCUSSIONS_SQLITE_DOWN = SHARED_DOWN;
export const DISCUSSIONS_POSTGRES_DOWN = SHARED_DOWN;

export function getDiscussionsMigration(dialect: DiscussionsDialect, direction: "up" | "down"): string {
  if (direction === "up") {
    return dialect === "postgres" ? DISCUSSIONS_POSTGRES_UP : DISCUSSIONS_SQLITE_UP;
  }
  return dialect === "postgres" ? DISCUSSIONS_POSTGRES_DOWN : DISCUSSIONS_SQLITE_DOWN;
}
