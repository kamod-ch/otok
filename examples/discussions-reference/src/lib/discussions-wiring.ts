import type { Kysely } from "kysely";
import type { OtokContext } from "@kamod-ch/otok/server";
import type { CreateDiscussionsOptions } from "@kamod-ch/otok-discussions/plugin";
import { createCapabilityRateLimiter, createDiscussionsRuntime } from "@kamod-ch/otok-discussions";
import {
  createKyselyDiscussionAdapter,
  type DiscussionsDatabase,
} from "@kamod-ch/otok-discussions/kysely";
import type { DiscussionActor, DiscussionPolicy, DiscussionSubject } from "@kamod-ch/otok-discussions";
import { pickDiscussionLocale } from "@kamod-ch/otok-discussions/i18n";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import {
  ARTICLE_MODERATED,
  TENANT_A,
  type RefDatabase,
} from "../db/types.js";
import type { RefDb } from "../db/client.js";

function runtimeDeps() {
  return {
    clock: { now: () => new Date() },
    ids: {
      createId: (prefix?: string) =>
        `${prefix ?? "id"}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    },
    events: { emit: () => {} },
  };
}

async function loadArticle(db: RefDb, slug: string) {
  return db.selectFrom("article").selectAll().where("slug", "=", slug).executeTakeFirst();
}

async function loadMemberRoles(db: RefDb, tenantId: string, userId: string): Promise<string[]> {
  const row = await db
    .selectFrom("tenant_member")
    .select(["roles"])
    .where("tenant_id", "=", tenantId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return row?.roles ?? [];
}

async function loadAllRoles(db: RefDb, userId: string): Promise<string[]> {
  const rows = await db
    .selectFrom("tenant_member")
    .select(["roles"])
    .where("user_id", "=", userId)
    .execute();
  const set = new Set<string>();
  for (const row of rows) {
    for (const role of row.roles) set.add(role);
  }
  return [...set];
}

async function resolveScopeTenant(db: RefDb, sessionUserId: string | null, slug: string | undefined): Promise<string> {
  if (slug) {
    const article = await loadArticle(db, slug);
    if (article) return article.tenant_id;
  }
  if (sessionUserId) {
    const row = await db
      .selectFrom("tenant_member")
      .select(["tenant_id"])
      .where("user_id", "=", sessionUserId)
      .orderBy("tenant_id asc")
      .executeTakeFirst();
    if (row) return row.tenant_id;
  }
  return TENANT_A;
}

function mapRoles(raw: string[]): string[] {
  const mapped = [...raw];
  if (raw.includes("trusted")) mapped.push("discussions_trusted");
  if (raw.includes("moderator")) mapped.push("moderator");
  return mapped;
}

function buildPolicy(): DiscussionPolicy {
  return {
    async can() {
      return true;
    },
  };
}

export function buildDiscussionsOptions(getDb: () => RefDb): CreateDiscussionsOptions {
  const deps = runtimeDeps();
  const adapter = createKyselyDiscussionAdapter({
    db: getDb() as Kysely<DiscussionsDatabase>,
    deps,
    config: {
      moderationMode: "post",
      trustedRole: "discussions_trusted",
      maxDepth: 6,
    },
  });

  const auth: CreateDiscussionsOptions["auth"] = {
    usesCookieSession: true,
    async resolveVerifiedScope(ctx: OtokContext) {
      const authRuntime = tryGetAuthRuntime();
      let sessionUserId: string | null = null;
      if (authRuntime) {
        const session = await authFromOtokContext(ctx.hono, authRuntime.helpers).getSession();
        sessionUserId = session?.id ?? null;
      }
      const slug = ctx.params.subjectId ?? ctx.params.slug;
      const tenantId = await resolveScopeTenant(getDb(), sessionUserId, slug ? String(slug) : undefined);
      return { tenantId, sessionUserId };
    },
  };

  return {
    basePath: "/discussions",
    subjectType: "article",
    adapter,
    runtime: createDiscussionsRuntime({}, deps),
    subjectResolver: {
      async resolve(ctx) {
        const article = await loadArticle(getDb(), ctx.subjectId);
        if (!article || article.tenant_id !== ctx.tenantId) {
          throw new Error("SUBJECT_DENIED");
        }
        return {
          tenantId: article.tenant_id,
          subjectType: "article",
          subjectId: article.slug,
        } satisfies DiscussionSubject;
      },
    },
    actorResolver: {
      async resolveActor(ctx) {
        const user = await getDb()
          .selectFrom("app_user")
          .selectAll()
          .where("id", "=", ctx.userId)
          .executeTakeFirst();
        if (!user) return null;
        const roles = mapRoles(await loadAllRoles(getDb(), user.id));
        return {
          id: user.id,
          displayName: user.display_name,
          roles,
        } satisfies DiscussionActor;
      },
    },
    policy: buildPolicy(),
    moderation: {
      async isModerator(actor, subject) {
        const roles = await loadMemberRoles(getDb(), subject.tenantId, actor.id);
        return roles.includes("moderator") || roles.includes("admin");
      },
    },
    auth,
    csrf: true,
    moderationRoutes: true,
    moderationAccess: {
      superAdminRole: "discussions_superadmin",
    },
    rateLimit: createCapabilityRateLimiter({ windowMs: 60_000, limits: {} }),
    spamProvider: {
      async checkComment(input) {
        if (input.subjectId !== ARTICLE_MODERATED) {
          return { signal: "allow", reasonCode: "ok", provider: "reference" };
        }
        const roles = await loadAllRoles(getDb(), input.authorId);
        if (roles.includes("trusted") || roles.includes("discussions_trusted")) {
          return { signal: "allow", reasonCode: "trusted", provider: "reference" };
        }
        return { signal: "review", reasonCode: "moderated_article", provider: "reference" };
      },
    },
    i18n: {
      defaultLocale: "de",
      resolveLocale: (ctx) =>
        pickDiscussionLocale(ctx.request.headers.get("accept-language"), "de"),
    },
    ui: {
      loginUrl: "/login",
      fixturesRoute: false,
    },
    threadDefaults: {},
  };
}

export function articleSubject(article: { tenant_id: string; slug: string }): DiscussionSubject {
  return { tenantId: article.tenant_id, subjectType: "article", subjectId: article.slug };
}
