import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface ForumCategoriesTable {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  thread_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface ForumThreadsTable {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  slug: string;
  status: string;
  is_pinned: number;
  view_count: number;
  post_count: number;
  last_post_id: string | null;
  last_post_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ForumPostsTable {
  id: string;
  thread_id: string;
  author_id: string;
  parent_post_id: string | null;
  content_markdown: string;
  content_html: string;
  revision: number;
  is_hidden: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ForumTagsTable {
  id: string;
  slug: string;
  name: string;
  thread_count: number;
  created_at: string;
}

export interface ForumThreadTagsTable {
  thread_id: string;
  tag_id: string;
}

export interface ForumPostRevisionsTable {
  id: string;
  post_id: string;
  revision: number;
  content_markdown: string;
  content_html: string;
  edited_by_id: string;
  created_at: string;
}

export interface ForumReactionsTable {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ForumSubscriptionsTable {
  id: string;
  thread_id: string;
  user_id: string;
  created_at: string;
}

export interface ForumReadStatesTable {
  id: string;
  thread_id: string;
  user_id: string;
  last_read_post_id: string | null;
  last_read_at: string;
}

export interface ForumReportsTable {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumModerationEventsTable {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  metadata: string | null;
  created_at: string;
}

export interface ForumDatabase {
  forum_categories: ForumCategoriesTable;
  forum_threads: ForumThreadsTable;
  forum_posts: ForumPostsTable;
  forum_tags: ForumTagsTable;
  forum_thread_tags: ForumThreadTagsTable;
  forum_post_revisions: ForumPostRevisionsTable;
  forum_reactions: ForumReactionsTable;
  forum_subscriptions: ForumSubscriptionsTable;
  forum_read_states: ForumReadStatesTable;
  forum_reports: ForumReportsTable;
  forum_moderation_events: ForumModerationEventsTable;
}

export type ForumCategoryRow = Selectable<ForumCategoriesTable>;
export type ForumThreadRow = Selectable<ForumThreadsTable>;
export type ForumPostRow = Selectable<ForumPostsTable>;

export type NewForumCategory = Insertable<ForumCategoriesTable>;
export type NewForumThread = Insertable<ForumThreadsTable>;
export type NewForumPost = Insertable<ForumPostsTable>;

export type UpdateForumThread = Updateable<ForumThreadsTable>;
export type UpdateForumPost = Updateable<ForumPostsTable>;

/** Placeholder for Kysely Generated columns if needed */
export type _Generated<T> = Generated<T>;
