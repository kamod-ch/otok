import type { OtokRoute, RouteModule } from "@kamod-ch/otok/server";
import type { OtokContext } from "@kamod-ch/otok/server";
import {
  buildDiscussionRequestContext,
  ensureLoaderCsrf,
  getDiscussionsState,
} from "../http/context.js";
import { runDiscussionThreadAction, discussionsThreadUrl } from "../http/actions.js";
import { rethrowDiscussionError } from "../http/errors.js";
import { parseThreadViewQuery } from "../http/thread-query.js";
import { discussionsThreadViewUrl } from "../ui/thread-url.js";
import { buildCommentTreeForRoots } from "./reply-tree.js";
import {
  currentRedirectPath,
  discussionsNowIso,
  resolveDiscussionsLocale,
  resolveIsModerator,
  resolveSubjectFromContext,
} from "./loader-helpers.js";
import type { PluginCommentTreeNode } from "../ui/map-page-data.js";
import {
  DiscussionsPermalinkPage,
  DiscussionsPreviewPage,
  DiscussionsRepliesPage,
  DiscussionsThreadPage,
} from "./components.js";
import { collectDiscussionRoutePaths, makeDiscussionRoute } from "./paths.js";
import { enrichCommentItems } from "./enrich-comments.js";
import type { CreateDiscussionsOptions } from "../http/types.js";
import { DiscussionFixturesPage } from "../ui/DiscussionFixturesPage.js";
import { discussionsPublicPageRendering, discussionsSafePageRendering } from "../http/cache-policy.js";

function viewerMeta(reqCtx: { sessionUserId?: string | null }, state: ReturnType<typeof getDiscussionsState>) {
  return {
    isAuthenticated: Boolean(reqCtx.sessionUserId),
    viewerUserId: reqCtx.sessionUserId ?? undefined,
    loginUrl: state.options.ui?.loginUrl,
  };
}

async function loaderPreview(ctx: OtokContext) {
  const state = getDiscussionsState(ctx.hono);
  const csrfToken = ensureLoaderCsrf(ctx, state);
  try {
    const reqCtx = await buildDiscussionRequestContext(ctx, state);
    const { thread } = await state.services.discussion.getOrCreateThread(reqCtx, {
      title: "Discussion",
      ...state.options.threadDefaults,
    });
    const page = await state.services.comments.listComments(reqCtx, {
      threadId: thread.id,
      rootsOnly: true,
      limit: 5,
      sort: "newest",
    });
    const subjectId = ctx.params.subjectId!;
    const items = await enrichCommentItems(state, page.items);
    const locale = await resolveDiscussionsLocale(ctx, state);
    return {
      title: thread.title,
      locale,
      nowIso: discussionsNowIso(state),
      csrfToken,
      actionUrl: discussionsThreadUrl(state.basePath, subjectId),
      threadId: thread.id,
      threadStatus: thread.status,
      replyCount: thread.replyCount,
      opensAt: thread.opensAt,
      fullDiscussionUrl: discussionsThreadUrl(state.basePath, subjectId),
      layout: "preview" as const,
      items,
      ...viewerMeta(reqCtx, state),
    };
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

async function loaderThread(ctx: OtokContext) {
  const state = getDiscussionsState(ctx.hono);
  const csrfToken = ensureLoaderCsrf(ctx, state);
  try {
    const reqCtx = await buildDiscussionRequestContext(ctx, state);
    const subject = await resolveSubjectFromContext(state, reqCtx);
    const { thread } = await state.services.discussion.getOrCreateThread(reqCtx, {
      title: "Discussion",
      ...state.options.threadDefaults,
    });
    const url = new URL(ctx.request.url);
    const query = parseThreadViewQuery(url);
    const sort = query.sort ?? "newest";
    const rootPageSize = state.options.ui?.rootPageSize ?? 20;
    const previewLimit = state.options.ui?.replyPreviewLimit ?? 3;
    const page = await state.services.comments.listComments(reqCtx, {
      threadId: thread.id,
      sort,
      cursor: query.cursor,
      limit: rootPageSize,
      rootsOnly: true,
    });
    const subjectId = ctx.params.subjectId!;
    const isModerator = await resolveIsModerator(state, reqCtx, subject);
    const tree = await buildCommentTreeForRoots(state, reqCtx, subject, thread.id, page.items, {
      maxDepth: state.options.runtime.config.maxDepth,
      previewLimit,
      sort,
      basePath: state.basePath,
      subjectId,
      threadStatus: thread.status,
      isModerator,
    });
    const redirectTo = currentRedirectPath(ctx.request.url);
    const jsonApiEnabled = Boolean(state.options.jsonApi?.enabled);
    const locale = await resolveDiscussionsLocale(ctx, state);
    return {
      title: thread.title,
      locale,
      nowIso: discussionsNowIso(state),
      csrfToken,
      actionUrl: discussionsThreadUrl(state.basePath, subjectId),
      redirectTo,
      threadId: thread.id,
      threadStatus: thread.status,
      replyCount: thread.replyCount,
      opensAt: thread.opensAt,
      layout: "thread" as const,
      sort,
      nextCursor: page.nextCursor,
      threadListUrl: discussionsThreadViewUrl(state.basePath, subjectId, { sort, cursor: query.cursor }),
      focusCommentId: query.focus,
      editCommentId: query.edit,
      reportCommentId: query.report,
      reportAcknowledged: query.reportAck === "1",
      maxDepth: state.options.runtime.config.maxDepth,
      maxCommentLength: state.options.runtime.rules.maxCommentLength,
      draftScope: `${thread.id}:root`,
      subjectId,
      basePath: state.basePath,
      jsonApi: jsonApiEnabled
        ? { reactionsUrl: `${state.basePath}/api/${encodeURIComponent(subjectId)}/reactions`.replace(/\/{2,}/g, "/") }
        : undefined,
      tree: tree as PluginCommentTreeNode[],
      ...viewerMeta(reqCtx, state),
    };
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

async function loaderReplies(ctx: OtokContext) {
  const state = getDiscussionsState(ctx.hono);
  const csrfToken = ensureLoaderCsrf(ctx, state);
  try {
    const reqCtx = await buildDiscussionRequestContext(ctx, state);
    const parentId = ctx.params.commentId!;
    const permalink = await state.services.comments.resolvePermalink(reqCtx, parentId);
    const page = await state.services.comments.listComments(reqCtx, {
      threadId: permalink.thread.id,
      replyToCommentId: parentId,
      limit: 20,
      sort: "oldest",
    });
    const items = await enrichCommentItems(state, page.items);
    const locale = await resolveDiscussionsLocale(ctx, state);
    return {
      title: "Replies",
      locale,
      nowIso: discussionsNowIso(state),
      csrfToken,
      actionUrl: discussionsThreadUrl(state.basePath, ctx.params.subjectId!),
      comment: { id: parentId },
      threadId: permalink.thread.id,
      threadStatus: permalink.thread.status,
      replyCount: permalink.thread.replyCount,
      layout: "thread" as const,
      items,
      ...viewerMeta(reqCtx, state),
    };
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

async function loaderPermalink(ctx: OtokContext) {
  const state = getDiscussionsState(ctx.hono);
  try {
    const reqCtx = await buildDiscussionRequestContext(ctx, state);
    const result = await state.services.comments.resolvePermalink(reqCtx, ctx.params.commentId!);
    const subjectId = ctx.params.subjectId!;
    const subject = await resolveSubjectFromContext(state, reqCtx);
    const isModerator = await resolveIsModerator(state, reqCtx, subject);
    const tree = await buildCommentTreeForRoots(state, reqCtx, subject, result.thread.id, [result.comment], {
      maxDepth: state.options.runtime.config.maxDepth,
      previewLimit: state.options.ui?.replyPreviewLimit ?? 3,
      sort: "oldest",
      basePath: state.basePath,
      subjectId,
      threadStatus: result.thread.status,
      isModerator,
    });
    const locale = await resolveDiscussionsLocale(ctx, state);
    return {
      title: "Comment",
      locale,
      nowIso: discussionsNowIso(state),
      comment: result.comment,
      threadId: result.thread.id,
      threadStatus: result.thread.status,
      layout: "permalink" as const,
      focusCommentId: result.comment.id,
      fullDiscussionUrl: discussionsThreadViewUrl(state.basePath, subjectId, {
        focus: result.comment.id,
      }),
      subjectId,
      basePath: state.basePath,
      maxDepth: state.options.runtime.config.maxDepth,
      maxCommentLength: state.options.runtime.rules.maxCommentLength,
      tree: tree as PluginCommentTreeNode[],
      ...viewerMeta(reqCtx, state),
    };
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

export function createDiscussionRoutes(
  basePath: string,
  middleware: OtokRoute["middleware"],
  options?: CreateDiscussionsOptions,
): OtokRoute[] {
  const pageRendering = options?.publicPageCache ? discussionsPublicPageRendering : discussionsSafePageRendering;
  const previewModule: RouteModule = {
    default: DiscussionsPreviewPage as RouteModule["default"],
    loader: loaderPreview,
    rendering: pageRendering,
  };
  const threadModule: RouteModule = {
    default: DiscussionsThreadPage as RouteModule["default"],
    loader: loaderThread,
    rendering: pageRendering,
    async action(ctx) {
      await runDiscussionThreadAction(ctx);
    },
  };
  const repliesModule: RouteModule = {
    default: DiscussionsRepliesPage as RouteModule["default"],
    loader: loaderReplies,
    rendering: pageRendering,
    async action(ctx) {
      await runDiscussionThreadAction(ctx);
    },
  };
  const permalinkModule: RouteModule = {
    default: DiscussionsPermalinkPage as RouteModule["default"],
    loader: loaderPermalink,
    rendering: pageRendering,
  };

  const routes: OtokRoute[] = [
    makeDiscussionRoute("discussions-preview", basePath, "/:subjectId", previewModule, middleware),
    makeDiscussionRoute("discussions-thread", basePath, "/:subjectId/thread", threadModule, middleware),
    makeDiscussionRoute("discussions-replies", basePath, "/:subjectId/replies/:commentId", repliesModule, middleware),
    makeDiscussionRoute("discussions-permalink", basePath, "/:subjectId/comment/:commentId", permalinkModule, middleware),
  ];

  if (options?.ui?.fixturesRoute) {
    const fixturesModule: RouteModule = {
      default: DiscussionFixturesPage as RouteModule["default"],
      loader: async () => ({ title: "Discussion UI fixtures" }),
    };
    routes.push(makeDiscussionRoute("discussions-ui-fixtures", basePath, "/_ui-fixtures", fixturesModule, middleware));
  }

  return routes;
}

export { collectDiscussionRoutePaths };
