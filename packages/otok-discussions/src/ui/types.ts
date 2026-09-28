import type { CommentSort, CommentStatus, DiscussionThreadStatus } from "../types/domain.js";
import type { DiscussionLocale } from "../i18n/create.js";

export type DiscussionShellState = "loading" | "error" | "ready";

export type DiscussionLayout = "preview" | "thread" | "permalink";

export interface DiscussionAuthorView {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface DiscussionCommentView {
  id: string;
  author: DiscussionAuthorView;
  bodyMarkdown: string;
  createdAt: string;
  /** Locale-stable display time (SSR + hydration). */
  displayTime?: string;
  status: CommentStatus;
  isPlaceholder: boolean;
  scorePositive: number;
  scoreNegative: number;
  /** Active reaction for the signed-in viewer on this comment. */
  viewerReaction?: {
    emoji: "👍" | "👎";
    reactionId?: string;
  } | null;
  depth?: number;
  directReplyCount?: number;
  showAllRepliesUrl?: string;
  permalinkUrl?: string;
  revision?: number;
  replies?: DiscussionCommentView[];
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canReply: boolean;
    canReport: boolean;
  };
}

export interface DiscussionFormConfig {
  actionUrl: string;
  csrfToken?: string;
  idempotencyKey?: string;
  redirectTo?: string;
  parentCommentId?: string;
  intent: "comment" | "reply";
}

export interface DiscussionUrls {
  fullDiscussion?: string;
  login?: string;
}

export interface DiscussionLabels {
  sectionTitle: string;
  discussionHeading: string;
  replyCount: (count: number) => string;
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  scheduledTitle: string;
  scheduledDescription: string;
  readOnlyTitle: string;
  readOnlyDescription: string;
  closedTitle: string;
  closedDescription: string;
  loginTitle: string;
  loginDescription: string;
  loginAction: string;
  composerLabel: string;
  composerPlaceholder: string;
  composerSubmit: string;
  composerPendingHint: string;
  showAllComments: string;
  agreeAction: string;
  disagreeAction: string;
  agreeCount: (count: number) => string;
  disagreeCount: (count: number) => string;
  pendingBadge: string;
  moderatedPlaceholder: string;
  permalink: string;
  sortNewest: string;
  sortOldest: string;
  sortPopular: string;
  loadMore: string;
  showReplies: (count: number) => string;
  replySubmit: string;
  replyLabel: string;
  reportAction: string;
  reportTitle: string;
  reportDescription: string;
  reportSubmit: string;
  reportCancel: string;
  reportAck: string;
  reportDuplicate: string;
  reportReasonLabel: string;
  reportDetailsLabel: string;
  editAction: string;
  editSubmit: string;
  deleteAction: string;
  deleteConfirm: string;
  deleteSubmit: string;
  charCount: (current: number, max: number) => string;
  viewInThread: string;
  skipToDiscussion: string;
  sortNavLabel: string;
  commentListLabel: string;
  reactionsGroupLabel: string;
  reactionsReadOnlyLabel: string;
  reportDialogLabel: string;
  commentByAuthor: (author: string) => string;
  a11yLoadingBusy: string;
  a11yComposerErrors: string;
  a11yMainStatus: string;
}

export interface DiscussionViewModel {
  shell: DiscussionShellState;
  layout: DiscussionLayout;
  thread?: {
    id: string;
    title: string;
    status: DiscussionThreadStatus;
    replyCount: number;
    opensAt?: string | null;
  };
  viewer: {
    isAuthenticated: boolean;
    userId?: string;
  };
  comments: DiscussionCommentView[];
  notices?: string[];
  errorMessage?: string;
  urls: DiscussionUrls;
  form?: DiscussionFormConfig;
  values?: { bodyMarkdown?: string };
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
  labels?: Partial<DiscussionLabels>;
  locale?: DiscussionLocale;
  nowIso?: string;
  sort?: CommentSort;
  nextCursor?: string;
  threadListUrl?: string;
  focusCommentId?: string;
  editCommentId?: string;
  reportCommentId?: string;
  reportAcknowledged?: boolean;
  maxDepth?: number;
  maxCommentLength?: number;
  draftScope?: string;
  subjectId?: string;
  basePath?: string;
  jsonApi?: {
    reactionsUrl?: string;
  };
}

export interface DiscussionProps {
  model: DiscussionViewModel;
  /** When true, apps may hydrate {@link CommentComposerLiveRegion} via Otok `<Island>` — not used by default SSR markup. */
  showComposer?: boolean;
}
