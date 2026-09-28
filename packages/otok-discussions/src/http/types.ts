import type { DiscussionsRuntime } from "../config.js";
import type { CommentService, DiscussionService, ModerationService } from "../services/index.js";
import type { DiscussionAdapter } from "../types/ports.js";
import type {
  ActorResolver,
  DiscussionPolicy,
  ModerationProvider,
  RateLimitProvider,
  SubjectResolver,
} from "../types/ports.js";
import type { ProviderFailureBehavior, SpamModerationProvider } from "../services/spam.js";
import type { ModerationMode } from "../types/domain.js";
import type { GetOrCreateThreadInput } from "../services/types.js";
import type { CsrfOptions } from "@kamod-ch/otok-auth/csrf";
import type { OtokContext } from "@kamod-ch/otok/server";

export interface DiscussionsVerifiedScope {
  tenantId: string;
  sessionUserId: string | null;
}

export interface DiscussionsAuthAdapter {
  resolveVerifiedScope(ctx: OtokContext): Promise<DiscussionsVerifiedScope>;
  /** When true, mutating form posts require CSRF (cookie session). */
  usesCookieSession?: boolean;
}

export interface DiscussionsJsonApiOptions {
  enabled?: boolean;
  /** Hono mount prefix, default `${basePath}/api`. */
  pathPrefix?: string;
}

export interface CreateDiscussionsOptions {
  basePath?: string;
  /** Fixed subject type for this mount (e.g. `job`). */
  subjectType: string;
  adapter: DiscussionAdapter;
  runtime: DiscussionsRuntime;
  subjectResolver: SubjectResolver;
  actorResolver: ActorResolver;
  policy: DiscussionPolicy;
  moderation: ModerationProvider;
  auth: DiscussionsAuthAdapter;
  csrf?: boolean | CsrfOptions;
  rateLimit?: RateLimitProvider;
  spamProvider?: SpamModerationProvider;
  spamFailureBehavior?: Partial<Record<ModerationMode, ProviderFailureBehavior>>;
  threadDefaults?: Omit<GetOrCreateThreadInput, "title">;
  jsonApi?: DiscussionsJsonApiOptions;
  /** Additional reserved paths checked at startup. */
  reservedPaths?: readonly string[];
  /** Existing app route paths for collision detection at startup. */
  existingRoutePaths?: readonly string[];
  /** Locale resolution for bundled UI (one i18n instance per request). */
  i18n?: {
    defaultLocale?: import("../i18n/create.js").DiscussionLocale;
    fallbackLocale?: import("../i18n/create.js").DiscussionLocale;
    resolveLocale?: (ctx: OtokContext) => import("../i18n/create.js").DiscussionLocale | Promise<import("../i18n/create.js").DiscussionLocale>;
  };
  /** Optional UI hints for bundled discussion pages (`./ui`). */
  ui?: {
    loginUrl?: string;
    /** Mount `DiscussionFixturesPage` at `{basePath}/_ui-fixtures` (visual QA). */
    fixturesRoute?: boolean;
    /** Direct replies shown per comment before „show more“ link (default 3). */
    replyPreviewLimit?: number;
    /** Root comments per thread page (default 20). */
    rootPageSize?: number;
  };
  /** Optional explicit store port (defaults to memory adapter internal store). */
  storePort?: import("../adapters/discussion-store-port.js").DiscussionStorePort;
  /** Superadmin role + tenant allow list — see docs/moderation.md */
  moderationAccess?: import("../moderation/access.js").ModerationAccessOptions;
  /** Mount SSR moderation routes under `{basePath}/moderation/*`. */
  moderationRoutes?: boolean;
  /**
   * Enable public HTML cache on discussion GET routes. Requires host middleware that calls
   * `setOtokCacheScope(c, { tenantId })` from verified session data (see docs/security-production.md).
   */
  publicPageCache?: boolean;
  /** Conservative cache revalidation after mutations (Otok `revalidateTag` / `revalidatePath`). */
  cacheInvalidation?: DiscussionsCacheInvalidation;
  /** Optional metrics sink (no PII). */
  metrics?: import("../observability/metrics.js").DiscussionsMetrics;
  /**
   * Optional notification preference HTTP routes (`./notifications`).
   * Queue bridge and delivery remain app-owned entrypoints.
   */
  notificationPreferences?: {
    subscriptions: import("../notifications/types.js").SubscriptionStorePort;
    pathPrefix?: string;
    resolveTenantUser: (
      ctx: import("hono").Context,
    ) => Promise<{ tenantId: string; userId: string } | null>;
  };
}

export interface DiscussionsCacheInvalidation {
  revalidateTags?: (tags: string[]) => void | Promise<void>;
  revalidatePaths?: (paths: string[]) => void | Promise<void>;
}

export interface DiscussionsServicesBundle {
  discussion: DiscussionService;
  comments: CommentService;
  moderation: ModerationService;
}

export interface DiscussionsContextState {
  options: CreateDiscussionsOptions;
  services: DiscussionsServicesBundle;
  basePath: string;
}

export interface DiscussionsExtension {
  basePath: string;
  routes: import("@kamod-ch/otok/server").OtokRoute[];
  middleware: import("@kamod-ch/otok/server").MiddlewareModule[];
  services: DiscussionsServicesBundle;
  configureJsonApi?: (app: import("hono").Hono) => void;
  configureNotificationPreferences?: (app: import("hono").Hono) => void;
}
