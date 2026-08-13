import { defineMiddleware, type MiddlewareModule, type OtokRoute } from "otok/server";
import type {
  ForumConfig,
  ForumExtension,
  ForumRuntimeContext,
} from "./types.js";
import { createForumServices } from "./services/index.js";
import { createDefaultMarkdownAdapter } from "./markdown.js";
import { normalizeBasePath } from "./utils.js";
import { createForumRoutes } from "./routes/index.js";
import { setForumState, type ForumContextState } from "./routes/context.js";
import { createDefaultComponents, FORUM_THEME_CSS } from "./components/index.js";

let forumRegistry: ForumExtension | null = null;

export function getForumExtension(): ForumExtension | null {
  return forumRegistry;
}

export function resetForumExtensionForTests(): void {
  forumRegistry = null;
}

export interface CreateForumOptions extends ForumConfig {
  basePath?: string;
}

/**
 * Create a production-ready forum extension for Otok apps.
 *
 * ```ts
 * const forum = createForum({ basePath: "/community", storage, auth });
 *
 * createOtokApp({
 *   routes: [...fileRoutes, ...forum.routes],
 * });
 * ```
 */
export function createForum(options: CreateForumOptions): ForumExtension {
  const basePath = normalizeBasePath(options.basePath ?? "/community");
  const markdown = options.markdown ?? createDefaultMarkdownAdapter();

  const config: ForumConfig = {
    ...options,
    basePath,
    markdown,
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
      ...options.pagination,
    },
    moderation: {
      reportReasons: ["spam", "harassment", "off-topic", "inappropriate", "other"],
      ...options.moderation,
    },
    rateLimit: {
      windowMs: 60_000,
      maxPosts: 20,
      maxThreads: 5,
      ...options.rateLimit,
    },
  };

  const services = createForumServices(config.storage, {
    markdown,
    search: config.search,
  });

  const middleware: MiddlewareModule[] = [
    {
      default: defineMiddleware(async (c, next) => {
        const state: ForumContextState = { config, services };
        setForumState(c, state);
        await next();
      }),
    },
  ];

  const routes = createForumRoutes(basePath, config, services).map((route) => ({
    ...route,
    middleware: [...middleware, ...(route.middleware ?? [])],
  }));

  const runtime: ForumRuntimeContext = {
    basePath,
    locale: config.locale ?? "en",
    t: (key) => key,
    user: null,
    permissions: [],
    can: () => false,
    url: (path) => `${basePath}${path.startsWith("/") ? path : `/${path}`}`,
    components: { ...createDefaultComponents(), ...config.components },
  };

  const extension: ForumExtension = { routes, services, middleware, runtime };
  forumRegistry = extension;
  return extension;
}

/** Inject forum theme CSS into SSR HTML (optional transform helper). */
export function injectForumTheme(html: string): string {
  if (html.includes("otok-forum")) return html;
  return html.replace("</head>", `<style>${FORUM_THEME_CSS}</style></head>`);
}

export * from "./types.js";
export * from "./permissions.js";
export * from "./validation.js";
export * from "./slug.js";
export * from "./markdown.js";
export * from "./i18n/index.js";
export * from "./services/index.js";
export { createForumRoutes } from "./routes/index.js";
