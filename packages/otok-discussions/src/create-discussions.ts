import { defineMiddleware, type MiddlewareModule } from "@kamod-ch/otok/server";
import { CommentService } from "./services/comment-service.js";
import { DiscussionService } from "./services/discussion-service.js";
import { ModerationService } from "./services/moderation-service.js";
import { assertDiscussionsBasePath, assertNoRouteCollisions, normalizeBasePath } from "./http/utils.js";
import type { CreateDiscussionsOptions, DiscussionsContextState, DiscussionsExtension } from "./http/types.js";
import { DISCUSSIONS_CTX_KEY, setDiscussionsState } from "./http/context.js";
import { collectDiscussionRoutePaths, createDiscussionRoutes } from "./routes/index.js";
import { createModerationRoutes } from "./routes/moderation/index.js";
import { registerDiscussionsJsonApi } from "./http/json-api.js";
import { registerDiscussionNotificationRoutes } from "./notifications/routes.js";

export function createDiscussions(options: CreateDiscussionsOptions): DiscussionsExtension {
  const basePath = normalizeBasePath(options.basePath ?? "/discussions");
  assertDiscussionsBasePath(basePath, options.reservedPaths ?? []);
  const routePaths = collectDiscussionRoutePaths(basePath);
  if (options.existingRoutePaths?.length) {
    assertNoRouteCollisions(options.existingRoutePaths, routePaths);
  }

  const accessDeps = {
    adapter: options.adapter,
    runtime: options.runtime,
    subjectResolver: options.subjectResolver,
    actorResolver: options.actorResolver,
    policy: options.policy,
    moderation: options.moderation,
  };

  const services = {
    discussion: new DiscussionService({ ...accessDeps, rateLimit: options.rateLimit }),
    comments: new CommentService({
      ...accessDeps,
      rateLimit: options.rateLimit,
      metrics: options.metrics,
      spamProvider: options.spamProvider,
      spamFailureBehavior: options.spamFailureBehavior,
    }),
    moderation: new ModerationService({
      ...accessDeps,
      store:
        options.storePort ??
        (options.adapter as { _store?: import("./adapters/discussion-store-port.js").DiscussionStorePort })._store,
      moderationAccess: options.moderationAccess,
      rateLimit: options.rateLimit,
      metrics: options.metrics,
    }),
  };

  const middleware: MiddlewareModule[] = [
    {
      default: defineMiddleware(async (c, next) => {
        const state: DiscussionsContextState = { options, services, basePath };
        setDiscussionsState(c, state);
        await next();
      }),
    },
  ];

  const routes = [
    ...createDiscussionRoutes(basePath, middleware, options),
    ...(options.moderationRoutes ? createModerationRoutes(basePath, middleware) : []),
  ].map((route) => ({
    ...route,
    middleware: [...middleware, ...(route.middleware ?? [])],
  }));

  const jsonApi = options.jsonApi;
  let configureJsonApi: DiscussionsExtension["configureJsonApi"];
  if (jsonApi?.enabled) {
    configureJsonApi = (app) => {
      registerDiscussionsJsonApi(app, {
        pathPrefix: jsonApi.pathPrefix ?? `${basePath}/api`,
        basePath,
        getState: (c) => {
          const state = c.get(DISCUSSIONS_CTX_KEY) as DiscussionsContextState | undefined;
          if (!state) throw new Error("discussions middleware missing");
          return state;
        },
      });
    };
  }

  let configureNotificationPreferences: DiscussionsExtension["configureNotificationPreferences"];
  const notificationPrefs = options.notificationPreferences;
  if (notificationPrefs) {
    const pathPrefix = notificationPrefs.pathPrefix ?? `${basePath}/notifications`;
    configureNotificationPreferences = (app) => {
      registerDiscussionNotificationRoutes(app, {
        pathPrefix,
        subscriptions: notificationPrefs.subscriptions,
        resolveTenantUser: notificationPrefs.resolveTenantUser,
      });
    };
  }

  return { basePath, routes, middleware, services, configureJsonApi, configureNotificationPreferences };
}

export type { CreateDiscussionsOptions, DiscussionsExtension } from "./http/types.js";
