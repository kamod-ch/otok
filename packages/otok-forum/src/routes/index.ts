import type { OtokRoute, RouteModule } from "@kamod-ch/otok/server";
import type { ForumConfig, ForumRuntimeContext } from "../types.js";
import type { ForumServices } from "../types.js";
import {
  buildRequestContext,
  buildRuntimeContext,
  buildThreadHead,
  checkForumRateLimit,
  forumForbidden,
  forumNotFound,
  forumRedirect,
  forumValidationFail,
  getForumState,
  resolvePermissions,
} from "./context.js";
import { CategoryList, ModerationQueue, NewThreadForm, ReportForm, SearchPage, ThreadList, ThreadPage } from "../components/default.js";
import {
  createPostSchema,
  createThreadSchema,
  editThreadSchema,
  parseTagsInput,
  reportSchema,
  searchSchema,
  validationErrorFromZod,
} from "../validation.js";
import { isCanonicalThreadSlug, parseThreadIdFromSlug } from "../slug.js";
import { paginationMeta } from "../utils.js";
import { FORUM_PERMISSIONS } from "../permissions.js";
import { ForumClosedThreadError } from "../services/posts.js";

function routePattern(base: string, suffix: string): { path: string; pattern: RegExp; params: string[] } {
  const full = `${base}${suffix}`.replace(/\/+/g, "/") || "/";
  const paramNames: string[] = [];
  const regex = full.replace(/:([a-zA-Z]+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return {
    path: full,
    pattern: new RegExp(`^${regex}/?$`),
    params: paramNames,
  };
}

function makeRoute(id: string, base: string, suffix: string, module: RouteModule): OtokRoute {
  const { path, pattern, params } = routePattern(base, suffix);
  return { id, path, pattern, params, module };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function createForumRoutes(basePath: string, config: ForumConfig, services: ForumServices): OtokRoute[] {
  const base = basePath.replace(/\/+$/, "") || "/community";

  const indexModule: RouteModule = {
    default: CategoryList as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const categories = await services.categories.list();
      return { categories, forum, title: forum.t("forum.title") };
    },
    head(props) {
      const data = props.data as Record<string, unknown>;
      const forum = data.forum as ForumRuntimeContext;
      return buildThreadHead(forum.t("forum.title"), forum.t("forum.categories"), forum.basePath, config.seo?.origin);
    },
  };

  const categoryModule: RouteModule = {
    default: ThreadList as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      if (!permissions.includes(FORUM_PERMISSIONS.CATEGORY_VIEW)) forumForbidden();
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const category = await services.categories.findBySlug(ctx.params.categorySlug!);
      if (!category) forumNotFound();
      const page = Number(new URL(ctx.request.url).searchParams.get("page") ?? 1);
      const pageSize = config.pagination?.defaultPageSize ?? 20;
      const threads = await services.threads.listByCategory(category.id, { page, pageSize });
      const total = await services.threads.listByCategory(category.id, { page: 1, pageSize: 1000 }).then((t) => t.length);
      return {
        category,
        threads,
        forum,
        pagination: paginationMeta(page, pageSize, total),
        pageUrl: `${forum.basePath}/c/${category.slug}`,
        title: category.name,
      };
    },
  };

  const threadModule: RouteModule = {
    default: ThreadPage as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const threadSlug = ctx.params.threadSlug!;
      const threadId = parseThreadIdFromSlug(threadSlug);
      const thread = threadId ? await services.threads.findById(threadId) : await services.threads.findBySlug(threadSlug);
      if (!thread || thread.deletedAt) forumNotFound();
      if (!isCanonicalThreadSlug(threadSlug, thread.id, thread.title)) {
        forumRedirect(forum.basePath, `${forum.basePath}/t/${thread.slug}`);
      }
      await services.threads.incrementViews(thread.id);
      const category = await services.categories.findById(thread.categoryId);
      if (!category) forumNotFound();
      const posts = await services.posts.listByThread(thread.id);
      const tags = await config.storage.tags.listByThread(thread.id);
      return {
        thread: { ...thread, tags },
        category,
        posts,
        authors: {},
        forum,
        title: thread.title,
      };
    },
    head(props) {
      const data = props.data as Record<string, unknown>;
      const thread = data.thread as { title: string; slug: string };
      const forum = data.forum as ForumRuntimeContext;
      return buildThreadHead(thread.title, thread.title, `${forum.basePath}/t/${thread.slug}`, config.seo?.origin, {
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "DiscussionForumPosting",
          headline: thread.title,
          url: `${config.seo?.origin ?? ""}${forum.basePath}/t/${thread.slug}`,
        },
      });
    },
    async action(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      if (!reqCtx.user) forumForbidden();
      const intent = String(ctx.formData?.get("intent") ?? "reply");
      const threadSlug = ctx.params.threadSlug!;
      const threadId = parseThreadIdFromSlug(threadSlug);
      const thread = threadId ? await services.threads.findById(threadId) : await services.threads.findBySlug(threadSlug);
      if (!thread) forumNotFound();

      if (intent === "reply") {
        checkForumRateLimit(config, `post:${reqCtx.user.id}`, "post");
        const parsed = createPostSchema.safeParse({
          threadId: thread.id,
          content: String(ctx.formData?.get("content") ?? ""),
        });
        if (!parsed.success) {
          forumValidationFail({
            ...validationErrorFromZod(parsed.error),
            values: { content: String(ctx.formData?.get("content") ?? "") },
          });
        }
        if (config.spam) {
          const spam = await config.spam.check({ userId: reqCtx.user.id, content: parsed.data.content });
          if (!spam.allowed) forumValidationFail({ formErrors: [spam.reason ?? "Spam detected"] });
        }
        try {
          await services.posts.create(
            { threadId: thread.id, contentMarkdown: parsed.data.content, authorId: reqCtx.user.id },
            permissions,
          );
        } catch (e) {
          if (e instanceof ForumClosedThreadError) forumValidationFail({ formErrors: [forum.t("forum.thread.closed")] });
          throw e;
        }
        forumRedirect(forum.basePath, `${forum.basePath}/t/${thread.slug}`);
      }

      if (intent === "close" && permissions.includes(FORUM_PERMISSIONS.THREAD_CLOSE)) {
        await services.threads.close(thread.id, permissions);
        forumRedirect(forum.basePath, `${forum.basePath}/t/${thread.slug}`);
      }

      forumForbidden();
    },
  };

  const newThreadModule: RouteModule = {
    default: NewThreadForm as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      if (!permissions.includes(FORUM_PERMISSIONS.THREAD_CREATE)) forumForbidden();
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const categories = await services.categories.list();
      return { categories, forum, title: forum.t("forum.newThread") };
    },
    async action(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      if (!reqCtx.user) forumForbidden();
      checkForumRateLimit(config, `thread:${reqCtx.user.id}`, "thread");
      const parsed = createThreadSchema.safeParse({
        categoryId: String(ctx.formData?.get("categoryId") ?? ""),
        title: String(ctx.formData?.get("title") ?? ""),
        content: String(ctx.formData?.get("content") ?? ""),
        tags: String(ctx.formData?.get("tags") ?? ""),
      });
      if (!parsed.success) {
        forumValidationFail({
          ...validationErrorFromZod(parsed.error),
          values: {
            categoryId: String(ctx.formData?.get("categoryId") ?? ""),
            title: String(ctx.formData?.get("title") ?? ""),
            content: String(ctx.formData?.get("content") ?? ""),
            tags: String(ctx.formData?.get("tags") ?? ""),
          },
        });
      }
      const { thread } = await services.threads.create(
        {
          categoryId: parsed.data.categoryId,
          title: parsed.data.title,
          contentMarkdown: parsed.data.content,
          tagNames: parseTagsInput(parsed.data.tags),
          authorId: reqCtx.user.id,
        },
        permissions,
      );
      forumRedirect(forum.basePath, `${forum.basePath}/t/${thread.slug}`);
    },
  };

  const searchModule: RouteModule = {
    default: SearchPage as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const q = new URL(ctx.request.url).searchParams.get("q") ?? "";
      if (!q) return { hits: [], q, forum, title: forum.t("forum.search") };
      const parsed = searchSchema.safeParse({ q, page: new URL(ctx.request.url).searchParams.get("page") ?? 1 });
      if (!parsed.success) return { hits: [], q, forum, title: forum.t("forum.search") };
      const result = await services.search.search(parsed.data, { user: reqCtx.user, permissions, basePath: forum.basePath });
      return { hits: result.hits, q, forum, title: forum.t("forum.search") };
    },
    head(props) {
      const data = props.data as Record<string, unknown>;
      const forum = data.forum as ForumRuntimeContext;
      return buildThreadHead(forum.t("forum.search"), "", `${forum.basePath}/search`, config.seo?.origin, { noindex: true });
    },
  };

  const moderationModule: RouteModule = {
    default: ModerationQueue as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      if (!permissions.includes(FORUM_PERMISSIONS.MODERATION_VIEW)) forumForbidden();
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const reports = await services.reports.list({ status: "open" });
      return { reports, forum, title: forum.t("forum.moderation") };
    },
    head(props) {
      const data = props.data as Record<string, unknown>;
      const forum = data.forum as ForumRuntimeContext;
      return buildThreadHead(forum.t("forum.moderation"), "", `${forum.basePath}/moderation`, config.seo?.origin, { noindex: true });
    },
  };

  const reportDetailModule: RouteModule = {
    default: ReportForm as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const report = await services.reports.findById(ctx.params.reportId!);
      if (!report) forumNotFound();
      return {
        forum,
        targetType: report.targetType,
        targetId: report.targetId,
        report,
        reportReasons: config.moderation?.reportReasons ?? ["spam", "harassment", "off-topic", "other"],
        title: forum.t("forum.reports"),
      };
    },
    async action(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      if (!reqCtx.user) forumForbidden();
      const intent = String(ctx.formData?.get("intent") ?? "");
      if (intent === "resolve") {
        await services.reports.review(ctx.params.reportId!, "resolved", reqCtx.user.id, permissions);
        forumRedirect(forum.basePath, `${forum.basePath}/moderation`);
      }
      if (intent === "dismiss") {
        await services.reports.review(ctx.params.reportId!, "dismissed", reqCtx.user.id, permissions);
        forumRedirect(forum.basePath, `${forum.basePath}/moderation`);
      }
      forumForbidden();
    },
  };

  const reportModule: RouteModule = {
    default: ReportForm as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const url = new URL(ctx.request.url);
      return {
        forum,
        targetType: url.searchParams.get("targetType") ?? "post",
        targetId: url.searchParams.get("targetId") ?? "",
        reportReasons: config.moderation?.reportReasons ?? ["spam", "harassment", "off-topic", "other"],
        title: forum.t("forum.report"),
      };
    },
    async action(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      if (!reqCtx.user) forumForbidden();
      const parsed = reportSchema.safeParse({
        targetType: String(ctx.formData?.get("targetType") ?? ""),
        targetId: String(ctx.formData?.get("targetId") ?? ""),
        reason: String(ctx.formData?.get("reason") ?? ""),
        details: String(ctx.formData?.get("details") ?? "") || undefined,
      });
      if (!parsed.success) forumValidationFail(validationErrorFromZod(parsed.error));
      await services.reports.create({ ...parsed.data, reporterId: reqCtx.user.id }, permissions);
      forumRedirect(forum.basePath, `${forum.basePath}/moderation`);
    },
  };

  const tagsModule: RouteModule = {
    default: CategoryList as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const tags = await config.storage.tags.list();
      return {
        categories: tags.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          sortOrder: 0,
          threadCount: t.threadCount,
          postCount: 0,
          createdAt: t.createdAt,
          updatedAt: t.createdAt,
        })),
        forum,
        title: forum.t("forum.tags"),
      };
    },
  };

  const tagThreadsModule: RouteModule = {
    default: ThreadList as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const tag = await config.storage.tags.findBySlug(ctx.params.tagSlug!);
      if (!tag) forumNotFound();
      const threads = await config.storage.tags.listThreadsByTag(tag.id, { page: 1, pageSize: 50 });
      return {
        threads,
        category: { id: tag.id, slug: tag.slug, name: tag.name, sortOrder: 0, threadCount: tag.threadCount, postCount: 0, createdAt: tag.createdAt, updatedAt: tag.createdAt },
        forum,
        title: tag.name,
      };
    },
  };

  const userModule: RouteModule = {
    default: ThreadList as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const userId = ctx.params.userId!;
      const allCategories = await services.categories.list();
      const threads = [];
      for (const cat of allCategories) {
        const list = await services.threads.listByCategory(cat.id, { pageSize: 100 });
        threads.push(...list.filter((t) => t.authorId === userId));
      }
      return {
        threads,
        category: { id: userId, slug: userId, name: userId, sortOrder: 0, threadCount: threads.length, postCount: 0, createdAt: "", updatedAt: "" },
        forum,
        title: userId,
      };
    },
  };

  const editThreadModule: RouteModule = {
    default: NewThreadForm as RouteModule["default"],
    async loader(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      const threadSlug = ctx.params.threadSlug!;
      const threadId = parseThreadIdFromSlug(threadSlug);
      const thread = threadId ? await services.threads.findById(threadId) : await services.threads.findBySlug(threadSlug);
      if (!thread) forumNotFound();
      const categories = await services.categories.list();
      return { categories, thread, forum, title: forum.t("forum.edit") };
    },
    async action(ctx) {
      const state = getForumState(ctx.hono);
      const reqCtx = await buildRequestContext(ctx, state);
      const permissions = await resolvePermissions(reqCtx.user, config.permissions);
      const forum = await buildRuntimeContext(reqCtx, state, permissions);
      if (!reqCtx.user) forumForbidden();
      const threadSlug = ctx.params.threadSlug!;
      const threadId = parseThreadIdFromSlug(threadSlug)!;
      const parsed = editThreadSchema.safeParse({
        threadId,
        title: String(ctx.formData?.get("title") ?? ""),
      });
      if (!parsed.success) forumValidationFail(validationErrorFromZod(parsed.error));
      const updated = await services.threads.rename(threadId, parsed.data.title, reqCtx.user.id, permissions);
      forumRedirect(forum.basePath, `${forum.basePath}/t/${updated.slug}`);
    },
  };

  const rssModule: RouteModule = {
    default: (() => null) as RouteModule["default"],
    async loader(ctx) {
      void ctx;
      const categories = await services.categories.list();
      const items: string[] = [];
      for (const cat of categories.slice(0, 5)) {
        const threads = await services.threads.listByCategory(cat.id, { pageSize: 20 });
        for (const t of threads) {
          items.push(`<item><title>${escapeXml(t.title)}</title><link>${base}/t/${t.slug}</link><pubDate>${t.createdAt}</pubDate></item>`);
        }
      }
      const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Forum</title>${items.join("")}</channel></rss>`;
      return new Response(xml, { headers: { "Content-Type": "application/rss+xml" } });
    },
  };

  return [
    makeRoute("forum-index", base, "", indexModule),
    makeRoute("forum-category", base, "/c/:categorySlug", categoryModule),
    makeRoute("forum-thread", base, "/t/:threadSlug", threadModule),
    makeRoute("forum-thread-edit", base, "/t/:threadSlug/edit", editThreadModule),
    makeRoute("forum-new", base, "/new", newThreadModule),
    makeRoute("forum-search", base, "/search", searchModule),
    makeRoute("forum-tags", base, "/tags", tagsModule),
    makeRoute("forum-tag", base, "/tags/:tagSlug", tagThreadsModule),
    makeRoute("forum-user", base, "/users/:userId", userModule),
    makeRoute("forum-moderation", base, "/moderation", moderationModule),
    makeRoute("forum-report-detail", base, "/moderation/reports/:reportId", reportDetailModule),
    makeRoute("forum-report-create", base, "/report", reportModule),
    makeRoute("forum-rss", base, "/rss.xml", rssModule),
  ];
}
