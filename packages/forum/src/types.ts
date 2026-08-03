import type { ComponentType } from "preact";
import type {
  MiddlewareModule,
  OtokActionContext,
  OtokContext,
  OtokHead,
  OtokPageProps,
  OtokRoute,
} from "otok/server";

// ─── Permissions ───────────────────────────────────────────────────────────

export type ForumPermission =
  | "category:view"
  | "thread:create"
  | "thread:update-own"
  | "thread:update-any"
  | "thread:close"
  | "thread:pin"
  | "thread:move"
  | "post:create"
  | "post:update-own"
  | "post:update-any"
  | "post:delete-own"
  | "post:delete-any"
  | "report:create"
  | "report:review"
  | "moderation:view";

export type ForumRole = "guest" | "member" | "moderator" | "admin";

// ─── Domain models ─────────────────────────────────────────────────────────

export type ForumThreadStatus = "open" | "closed" | "archived";

export type ForumReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface ForumUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  roles: string[];
}

export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  sortOrder: number;
  threadCount: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ForumThread {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  status: ForumThreadStatus;
  isPinned: boolean;
  viewCount: number;
  postCount: number;
  lastPostId: string | null;
  lastPostAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  parentPostId: string | null;
  contentMarkdown: string;
  contentHtml: string;
  revision: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ForumTag {
  id: string;
  slug: string;
  name: string;
  threadCount: number;
  createdAt: string;
}

export interface ForumReaction {
  id: string;
  postId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ForumSubscription {
  id: string;
  threadId: string;
  userId: string;
  createdAt: string;
}

export interface ForumReadState {
  id: string;
  threadId: string;
  userId: string;
  lastReadPostId: string | null;
  lastReadAt: string;
}

export interface ForumReport {
  id: string;
  reporterId: string;
  targetType: "thread" | "post";
  targetId: string;
  reason: string;
  details?: string;
  status: ForumReportStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForumModerationEvent {
  id: string;
  actorId: string;
  action: string;
  targetType: "thread" | "post" | "report";
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ForumPostRevision {
  id: string;
  postId: string;
  revision: number;
  contentMarkdown: string;
  contentHtml: string;
  editedById: string;
  createdAt: string;
}

// ─── Request context ───────────────────────────────────────────────────────

export interface ForumRequestContext {
  otok: OtokContext | OtokActionContext;
  user: ForumUser | null;
  basePath: string;
  locale: string;
}

// ─── Adapters ──────────────────────────────────────────────────────────────

export interface ForumAuthAdapter {
  getCurrentUser(context: ForumRequestContext): Promise<ForumUser | null>;
}

export interface ForumPermissionsAdapter {
  resolvePermissions(user: ForumUser | null): Promise<ForumPermission[]>;
}

export interface ForumCategoryRepository {
  create(input: CreateCategoryInput): Promise<ForumCategory>;
  list(): Promise<ForumCategory[]>;
  findById(id: string): Promise<ForumCategory | null>;
  findBySlug(slug: string): Promise<ForumCategory | null>;
}

export interface ForumThreadRepository {
  create(input: CreateThreadRecord): Promise<ForumThread>;
  update(id: string, patch: Partial<ForumThread>): Promise<ForumThread>;
  findById(id: string): Promise<ForumThread | null>;
  findBySlug(slug: string): Promise<ForumThread | null>;
  listByCategory(categoryId: string, options: ThreadListOptions): Promise<ForumThread[]>;
  countByCategory(categoryId: string): Promise<number>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
}

export interface ForumPostRepository {
  create(input: CreatePostRecord): Promise<ForumPost>;
  update(id: string, patch: Partial<ForumPost>): Promise<ForumPost>;
  findById(id: string): Promise<ForumPost | null>;
  listByThread(threadId: string, options: PostListOptions): Promise<ForumPost[]>;
  countByThread(threadId: string, includeDeleted?: boolean): Promise<number>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  saveRevision(revision: Omit<ForumPostRevision, "id">): Promise<void>;
}

export interface ForumTagRepository {
  findOrCreate(names: string[]): Promise<ForumTag[]>;
  list(): Promise<ForumTag[]>;
  findBySlug(slug: string): Promise<ForumTag | null>;
  attachToThread(threadId: string, tagIds: string[]): Promise<void>;
  listByThread(threadId: string): Promise<ForumTag[]>;
  listThreadsByTag(tagId: string, options: ThreadListOptions): Promise<ForumThread[]>;
}

export interface ForumReactionRepository {
  upsert(postId: string, userId: string, emoji: string): Promise<ForumReaction>;
  remove(postId: string, userId: string, emoji: string): Promise<void>;
  listByPost(postId: string): Promise<ForumReaction[]>;
}

export interface ForumSubscriptionRepository {
  subscribe(threadId: string, userId: string): Promise<ForumSubscription>;
  unsubscribe(threadId: string, userId: string): Promise<void>;
  isSubscribed(threadId: string, userId: string): Promise<boolean>;
}

export interface ForumReadStateRepository {
  upsert(threadId: string, userId: string, lastReadPostId: string | null): Promise<ForumReadState>;
  find(threadId: string, userId: string): Promise<ForumReadState | null>;
}

export interface ForumReportRepository {
  create(input: CreateReportInput): Promise<ForumReport>;
  update(id: string, patch: Partial<ForumReport>): Promise<ForumReport>;
  findById(id: string): Promise<ForumReport | null>;
  list(options: ReportListOptions): Promise<ForumReport[]>;
}

export interface ForumModerationRepository {
  append(event: Omit<ForumModerationEvent, "id">): Promise<ForumModerationEvent>;
  list(options: ModerationListOptions): Promise<ForumModerationEvent[]>;
}

export interface ForumStorageAdapter {
  categories: ForumCategoryRepository;
  threads: ForumThreadRepository;
  posts: ForumPostRepository;
  tags: ForumTagRepository;
  reactions: ForumReactionRepository;
  subscriptions: ForumSubscriptionRepository;
  readStates: ForumReadStateRepository;
  reports: ForumReportRepository;
  moderation: ForumModerationRepository;
  /** Run callback in a transaction when supported. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

// ─── Notifications & spam ──────────────────────────────────────────────────

export interface ThreadReplyNotification {
  thread: ForumThread;
  post: ForumPost;
  author: ForumUser;
  recipients: ForumUser[];
}

export interface MentionNotification {
  thread: ForumThread;
  post: ForumPost;
  mentionedUsers: ForumUser[];
  author: ForumUser;
}

export interface ModerationNotification {
  event: ForumModerationEvent;
  actor: ForumUser;
}

export interface ForumNotificationAdapter {
  threadReply?(event: ThreadReplyNotification): Promise<void>;
  mention?(event: MentionNotification): Promise<void>;
  moderationEvent?(event: ModerationNotification): Promise<void>;
}

export interface ForumSpamInput {
  userId: string | null;
  content: string;
  ip?: string;
}

export interface ForumSpamResult {
  allowed: boolean;
  reason?: string;
}

export interface ForumSpamAdapter {
  check(input: ForumSpamInput): Promise<ForumSpamResult>;
}

// ─── Search ────────────────────────────────────────────────────────────────

export interface ForumSearchQuery {
  q: string;
  categoryId?: string;
  tagSlug?: string;
  page?: number;
  pageSize?: number;
}

export interface ForumSearchContext {
  user: ForumUser | null;
  permissions: ForumPermission[];
  basePath: string;
}

export interface ForumSearchHit {
  type: "thread" | "post";
  thread: ForumThread;
  post?: ForumPost;
  snippet?: string;
}

export interface ForumSearchResult {
  hits: ForumSearchHit[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ForumSearchAdapter {
  search(query: ForumSearchQuery, context: ForumSearchContext): Promise<ForumSearchResult>;
}

// ─── Markdown ──────────────────────────────────────────────────────────────

export interface ForumMarkdownAdapter {
  render(markdown: string): { html: string };
  sanitize(html: string): string;
}

// ─── i18n ──────────────────────────────────────────────────────────────────

export type ForumLocale = "en" | "de";

export interface ForumMessages {
  [key: string]: string;
}

export interface ForumMessageAdapter {
  locale: ForumLocale;
  t(key: string, params?: Record<string, string | number>): string;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface ForumPaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Moderation config ─────────────────────────────────────────────────────

export interface ForumModerationConfig {
  reportReasons: string[];
}

// ─── Component overrides ───────────────────────────────────────────────────

export interface ForumPageProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T & { forum?: ForumRuntimeContext };
  loaderData?: T & { forum?: ForumRuntimeContext };
  actionData?: unknown;
  params?: Record<string, string>;
  route?: string;
  forum?: ForumRuntimeContext;
}

export interface ForumComponentOverrides {
  ForumLayout?: ComponentType<ForumPageProps>;
  CategoryList?: ComponentType<ForumPageProps>;
  CategoryCard?: ComponentType<{ category: ForumCategory; href: string; forum: ForumRuntimeContext }>;
  ThreadList?: ComponentType<ForumPageProps>;
  ThreadListItem?: ComponentType<{ thread: ForumThread; href: string; forum: ForumRuntimeContext }>;
  ThreadPage?: ComponentType<ForumPageProps>;
  ThreadHeader?: ComponentType<{ thread: ForumThread; category: ForumCategory; forum: ForumRuntimeContext }>;
  PostList?: ComponentType<ForumPageProps>;
  Post?: ComponentType<{ post: ForumPost; author?: ForumUser; forum: ForumRuntimeContext }>;
  PostActions?: ComponentType<{ post: ForumPost; forum: ForumRuntimeContext }>;
  PostComposer?: ComponentType<ForumPageProps>;
  MarkdownPreview?: ComponentType<{ markdown: string; forum: ForumRuntimeContext }>;
  Pagination?: ComponentType<{ meta: PaginationMeta; baseUrl: string; forum: ForumRuntimeContext }>;
  TagList?: ComponentType<{ tags: ForumTag[]; basePath: string; forum: ForumRuntimeContext }>;
  UserAvatar?: ComponentType<{ user?: ForumUser; size?: number }>;
  EmptyState?: ComponentType<{ title: string; message?: string; forum: ForumRuntimeContext }>;
  ForumError?: ComponentType<{ message: string; forum: ForumRuntimeContext }>;
  ReportForm?: ComponentType<ForumPageProps>;
  ModerationQueue?: ComponentType<ForumPageProps>;
  SearchPage?: ComponentType<ForumPageProps>;
  NewThreadForm?: ComponentType<ForumPageProps>;
}

// ─── Service inputs ────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  slug: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateThreadRecord {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  status?: ForumThreadStatus;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRecord {
  id: string;
  threadId: string;
  authorId: string;
  parentPostId?: string | null;
  contentMarkdown: string;
  contentHtml: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportInput {
  reporterId: string;
  targetType: "thread" | "post";
  targetId: string;
  reason: string;
  details?: string;
}

export interface ThreadListOptions {
  page?: number;
  pageSize?: number;
  sort?: "recent" | "popular" | "pinned";
  includeDeleted?: boolean;
}

export interface PostListOptions {
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
  includeHidden?: boolean;
}

export interface ReportListOptions {
  status?: ForumReportStatus;
  page?: number;
  pageSize?: number;
}

export interface ModerationListOptions {
  targetType?: "thread" | "post" | "report";
  targetId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateThreadInput {
  categoryId: string;
  title: string;
  contentMarkdown: string;
  tagNames?: string[];
  authorId: string;
}

export interface CreatePostInput {
  threadId: string;
  contentMarkdown: string;
  parentPostId?: string;
  authorId: string;
}

export interface EditPostInput {
  postId: string;
  contentMarkdown: string;
  editorId: string;
}

export interface MoveThreadInput {
  threadId: string;
  categoryId: string;
  actorId: string;
}

// ─── Services ──────────────────────────────────────────────────────────────

export interface ForumServices {
  categories: import("./services/categories.js").CategoryService;
  threads: import("./services/threads.js").ThreadService;
  posts: import("./services/posts.js").PostService;
  reactions: import("./services/reactions.js").ReactionService;
  subscriptions: import("./services/subscriptions.js").SubscriptionService;
  readStates: import("./services/subscriptions.js").ReadStateService;
  reports: import("./services/reports.js").ReportService;
  moderation: import("./services/reports.js").ModerationService;
  search: import("./services/search.js").SearchService;
}

// ─── Config ────────────────────────────────────────────────────────────────

export interface ForumRateLimitConfig {
  windowMs: number;
  maxPosts: number;
  maxThreads: number;
}

export interface ForumSeoConfig {
  siteName: string;
  origin: string;
  titleTemplate?: string;
}

export interface ForumConfig {
  basePath?: string;
  storage: ForumStorageAdapter;
  auth: ForumAuthAdapter;
  permissions?: ForumPermissionsAdapter;
  components?: ForumComponentOverrides;
  markdown?: ForumMarkdownAdapter;
  pagination?: Partial<ForumPaginationConfig>;
  moderation?: Partial<ForumModerationConfig>;
  notifications?: ForumNotificationAdapter;
  spam?: ForumSpamAdapter;
  search?: ForumSearchAdapter;
  messages?: ForumMessageAdapter;
  rateLimit?: Partial<ForumRateLimitConfig>;
  seo?: ForumSeoConfig;
  locale?: ForumLocale;
}

export interface ForumRuntimeContext {
  basePath: string;
  locale: ForumLocale;
  t: (key: string, params?: Record<string, string | number>) => string;
  user: ForumUser | null;
  permissions: ForumPermission[];
  can: (permission: ForumPermission) => boolean;
  url: (path: string) => string;
  components: Required<ForumComponentOverrides>;
}

export interface ForumExtension {
  routes: OtokRoute[];
  services: ForumServices;
  middleware: MiddlewareModule[];
  runtime: ForumRuntimeContext;
}

export type ForumHeadResolver = (props: ForumPageProps) => OtokHead | Promise<OtokHead>;

export interface ForumPluginOptions extends ForumConfig {
  /** Plugin name override */
  name?: string;
}
