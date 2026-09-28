import type { CommentSort, DiscussionComment, DiscussionThread } from "../types/domain.js";
import { createDiscussionsI18n, type DiscussionLocale } from "../i18n/create.js";
import { discussionLabelsFromI18n } from "../i18n/labels.js";
import { formatCommentRelativeTime } from "../i18n/format-time.js";
import type { DiscussionCommentView, DiscussionLayout, DiscussionViewModel } from "./types.js";

export interface PluginCommentTreeNode {
  id: string;
  bodyMarkdown: string;
  authorId: string;
  status: DiscussionComment["status"];
  isPlaceholder: boolean;
  scorePositive: number;
  scoreNegative: number;
  createdAt: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  depth: number;
  parentCommentId: string | null;
  revision: number;
  directReplyCount: number;
  moreDirectRepliesAvailable?: boolean;
  replies: PluginCommentTreeNode[];
  viewerReaction?: { emoji: "👍" | "👎"; reactionId?: string } | null;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canReply: boolean;
    canReport: boolean;
  };
  permalinkUrl: string;
  showAllRepliesUrl?: string;
}

export interface PluginDiscussionPageData {
  title: string;
  csrfToken?: string;
  actionUrl: string;
  redirectTo?: string;
  threadId?: string;
  threadStatus?: DiscussionThread["status"];
  replyCount?: number;
  opensAt?: string | null;
  isAuthenticated?: boolean;
  viewerUserId?: string;
  loginUrl?: string;
  fullDiscussionUrl?: string;
  layout?: DiscussionLayout;
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
  jsonApi?: { reactionsUrl?: string };
  tree?: PluginCommentTreeNode[];
  items?: Array<
    Pick<
      DiscussionComment,
      "id" | "bodyMarkdown" | "authorId" | "status" | "isPlaceholder" | "scorePositive" | "scoreNegative" | "createdAt"
    > & {
      authorDisplayName?: string;
      authorAvatarUrl?: string;
    }
  >;
  values?: Record<string, string>;
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
  errorMessage?: string;
  comment?: { id: string; bodyMarkdown?: string; status?: DiscussionComment["status"] };
  locale?: DiscussionLocale;
  nowIso?: string;
}

function mapComment(
  item: {
    id: string;
    bodyMarkdown: string;
    authorId: string;
    status: DiscussionComment["status"];
    isPlaceholder: boolean;
    scorePositive: number;
    scoreNegative: number;
    createdAt: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  },
  formatTime: (iso: string) => string,
): DiscussionCommentView {
  return {
    id: item.id,
    author: {
      id: item.authorId,
      displayName: item.authorDisplayName ?? item.authorId,
      avatarUrl: item.authorAvatarUrl,
    },
    bodyMarkdown: item.bodyMarkdown,
    createdAt: item.createdAt,
    displayTime: formatTime(item.createdAt),
    status: item.status,
    isPlaceholder: item.isPlaceholder,
    scorePositive: item.scorePositive,
    scoreNegative: item.scoreNegative,
  };
}

function mapTreeNode(node: PluginCommentTreeNode, formatTime: (iso: string) => string): DiscussionCommentView {
  return {
    ...mapComment(node, formatTime),
    depth: node.depth,
    directReplyCount: node.directReplyCount,
    showAllRepliesUrl: node.showAllRepliesUrl,
    permalinkUrl: node.permalinkUrl,
    revision: node.revision,
    viewerReaction: node.viewerReaction,
    permissions: node.permissions,
    replies: node.replies.map((child) => mapTreeNode(child, formatTime)),
  };
}

export function discussionViewModelFromPageData(data: PluginDiscussionPageData): DiscussionViewModel {
  const layout = data.layout ?? "thread";
  const shell = data.errorMessage ? "error" : "ready";
  const locale = data.locale ?? "de";
  const nowIso = data.nowIso ?? "2026-01-01T00:00:00.000Z";
  const i18n = createDiscussionsI18n({ locale });
  const labels = discussionLabelsFromI18n(i18n);
  const formatTime = (iso: string) => formatCommentRelativeTime(i18n, iso, nowIso);
  const comments = data.tree?.length
    ? data.tree.map((node) => mapTreeNode(node, formatTime))
    : (data.items ?? []).map((item) => mapComment(item, formatTime));

  return {
    shell,
    layout,
    thread: data.threadId
      ? {
          id: data.threadId,
          title: data.title,
          status: data.threadStatus ?? "open",
          replyCount: data.replyCount ?? comments.length,
          opensAt: data.opensAt,
        }
      : undefined,
    viewer: {
      isAuthenticated: Boolean(data.isAuthenticated),
      userId: data.viewerUserId,
    },
    comments,
    errorMessage: data.errorMessage,
    urls: {
      fullDiscussion: data.fullDiscussionUrl,
      login: data.loginUrl,
    },
    form: {
      actionUrl: data.actionUrl,
      csrfToken: data.csrfToken,
      idempotencyKey: "comment-create",
      redirectTo: data.redirectTo ?? data.actionUrl,
      intent: "comment",
    },
    values: data.values,
    formErrors: data.formErrors,
    fieldErrors: data.fieldErrors,
    sort: data.sort ?? "newest",
    nextCursor: data.nextCursor,
    threadListUrl: data.threadListUrl,
    focusCommentId: data.focusCommentId,
    editCommentId: data.editCommentId,
    reportCommentId: data.reportCommentId,
    reportAcknowledged: data.reportAcknowledged,
    maxDepth: data.maxDepth,
    maxCommentLength: data.maxCommentLength,
    draftScope: data.draftScope,
    subjectId: data.subjectId,
    basePath: data.basePath,
    jsonApi: data.jsonApi,
    locale,
    nowIso,
    labels,
  };
}
