import type { OtokRoute, RouteModule } from "@kamod-ch/otok/server";
import type { OtokContext } from "@kamod-ch/otok/server";
import { buildModerationRequestContext, ensureLoaderCsrf, getDiscussionsState } from "../../http/context.js";
import { rethrowDiscussionError } from "../../http/errors.js";
import { runModerationAction } from "../../http/moderation-actions.js";
import { createDiscussionsI18n } from "../../i18n/create.js";
import { moderationLabelsFromI18n } from "../../i18n/moderation-labels.js";
import { discussionsNowIso, resolveDiscussionsLocale } from "../loader-helpers.js";
import { makeDiscussionRoute } from "../paths.js";
import { ModerationDetailPage, ModerationQueuePage } from "./pages.js";
import { discussionsModerationRendering } from "../../http/cache-policy.js";

async function loaderQueue(ctx: OtokContext) {
  const state = getDiscussionsState(ctx.hono);
  ensureLoaderCsrf(ctx, state);
  try {
    const reqCtx = await buildModerationRequestContext(ctx, state);
    const url = new URL(ctx.request.url);
    const tenantId = reqCtx.tenantId;
    const locale = await resolveDiscussionsLocale(ctx, state);
    const i18n = createDiscussionsI18n({ locale });
    const labels = moderationLabelsFromI18n(i18n);
    const page = await state.services.moderation.listQueue(reqCtx, {
      tenantId,
      queueKind: (url.searchParams.get("kind") as "pending" | "reported" | "auto_flagged" | "all") ?? "all",
      cursor: url.searchParams.get("cursor") ?? undefined,
      authorId: url.searchParams.get("authorId") ?? undefined,
      threadId: url.searchParams.get("threadId") ?? undefined,
      subjectType: state.options.subjectType,
      subjectId: ctx.params.subjectId,
    });
    return {
      title: labels.queueTitle,
      items: page.items,
      nextCursor: page.nextCursor,
      tenantId,
      locale,
      nowIso: discussionsNowIso(state),
      labels,
      csrfToken: ensureLoaderCsrf(ctx, state),
      actionUrl: url.pathname,
    };
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

async function loaderDetail(ctx: OtokContext) {
  const state = getDiscussionsState(ctx.hono);
  ensureLoaderCsrf(ctx, state);
  try {
    const reqCtx = await buildModerationRequestContext(ctx, state);
    const commentId = ctx.params.commentId!;
    const detail = await state.services.moderation.getCommentDetail(reqCtx, commentId);
    const locale = await resolveDiscussionsLocale(ctx, state);
    const labels = moderationLabelsFromI18n(createDiscussionsI18n({ locale }));
    return {
      title: labels.detailTitle,
      detail,
      locale,
      labels,
      csrfToken: ensureLoaderCsrf(ctx, state),
      actionUrl: ctx.request.url.split("?")[0] ?? "",
    };
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

export function createModerationRoutes(basePath: string, middleware: OtokRoute["middleware"]): OtokRoute[] {
  const queueModule: RouteModule = {
    default: ModerationQueuePage as RouteModule["default"],
    loader: loaderQueue,
    rendering: discussionsModerationRendering,
    async action(ctx) {
      await runModerationAction(ctx);
    },
  };
  const detailModule: RouteModule = {
    default: ModerationDetailPage as RouteModule["default"],
    loader: loaderDetail,
    rendering: discussionsModerationRendering,
    async action(ctx) {
      await runModerationAction(ctx);
    },
  };
  return [
    makeDiscussionRoute("moderation-queue", basePath, "/moderation/queue", queueModule, middleware),
    makeDiscussionRoute("moderation-detail", basePath, "/moderation/comments/:commentId", detailModule, middleware),
  ];
}
