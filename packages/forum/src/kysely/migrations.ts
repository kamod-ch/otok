export type ForumDialect = "sqlite" | "postgres";

export const FORUM_MIGRATION_ID = "20260803140000_forum_initial";

export const FORUM_SQLITE_UP = `
CREATE TABLE IF NOT EXISTS forum_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  thread_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forum_categories_sort ON forum_categories(sort_order);

CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES forum_categories(id),
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  last_post_id TEXT,
  last_post_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id, is_pinned DESC, last_post_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_slug ON forum_threads(slug);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_post ON forum_threads(last_post_at DESC);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES forum_threads(id),
  author_id TEXT NOT NULL,
  parent_post_id TEXT REFERENCES forum_posts(id),
  content_markdown TEXT NOT NULL,
  content_html TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);

CREATE TABLE IF NOT EXISTS forum_tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  thread_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forum_tags_slug ON forum_tags(slug);

CREATE TABLE IF NOT EXISTS forum_thread_tags (
  thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, tag_id)
);

CREATE TABLE IF NOT EXISTS forum_post_revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT NOT NULL,
  edited_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forum_post_revisions_post ON forum_post_revisions(post_id, revision DESC);

CREATE TABLE IF NOT EXISTS forum_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post ON forum_reactions(post_id);

CREATE TABLE IF NOT EXISTS forum_subscriptions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_read_states (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  last_read_post_id TEXT,
  last_read_at TEXT NOT NULL,
  UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  reviewed_by_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS forum_moderation_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forum_moderation_target ON forum_moderation_events(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_moderation_actor ON forum_moderation_events(actor_id, created_at DESC);
`;

export const FORUM_POSTGRES_UP = FORUM_SQLITE_UP;

export const FORUM_SQLITE_DOWN = `
DROP TABLE IF EXISTS forum_moderation_events;
DROP TABLE IF EXISTS forum_reports;
DROP TABLE IF EXISTS forum_read_states;
DROP TABLE IF EXISTS forum_subscriptions;
DROP TABLE IF EXISTS forum_reactions;
DROP TABLE IF EXISTS forum_post_revisions;
DROP TABLE IF EXISTS forum_thread_tags;
DROP TABLE IF EXISTS forum_tags;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS forum_threads;
DROP TABLE IF EXISTS forum_categories;
`;

export const FORUM_POSTGRES_DOWN = FORUM_SQLITE_DOWN;

export function getForumMigration(dialect: ForumDialect, direction: "up" | "down"): string {
  if (direction === "up") {
    return dialect === "postgres" ? FORUM_POSTGRES_UP : FORUM_SQLITE_UP;
  }
  return dialect === "postgres" ? FORUM_POSTGRES_DOWN : FORUM_SQLITE_DOWN;
}
