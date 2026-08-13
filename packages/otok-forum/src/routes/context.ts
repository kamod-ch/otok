import type { OtokActionContext, OtokContext, OtokHead } from "@kamod-ch/otok/server";
import { fail, redirect, validationError } from "@kamod-ch/otok/server";
import type {
  ForumAuthAdapter,
  ForumConfig,
  ForumPermission,
  ForumPermissionsAdapter,
  ForumRequestContext,
  ForumRuntimeContext,
  ForumServices,
  ForumUser,
} from "../types.js";
import { permissionsForUser } from "../permissions.js";
import { createMessageAdapter } from "../i18n/index.js";
import { createDefaultComponents } from "../components/index.js";
import { normalizeBasePath, safeRedirectPath, checkRateLimit } from "../utils.js";
import { hasForumPermission } from "../permissions.js";

export interface ForumContextState {
  config: ForumConfig;
  services: ForumServices;
}

const FORUM_CTX_KEY = "forum";

export function setForumState(hono: OtokContext["hono"], state: ForumContextState): void {
  (hono as { set: (k: string, v: unknown) => void }).set(FORUM_CTX_KEY, state);
}

export function getForumState(hono: OtokContext["hono"]): ForumContextState {
  const state = (hono as { get: (k: string) => unknown }).get(FORUM_CTX_KEY);
  if (!state) throw new Error("@kamod-ch/otok-forum: forum middleware not applied");
  return state as ForumContextState;
}

export async function buildRequestContext(
  otok: OtokContext | OtokActionContext,
  state: ForumContextState,
): Promise<ForumRequestContext> {
  const basePath = normalizeBasePath(state.config.basePath ?? "/community");
  const locale = state.config.locale ?? "en";
  const partial: ForumRequestContext = {
    otok,
    user: null,
    basePath,
    locale,
  };
  const user = await state.config.auth.getCurrentUser(partial);
  return { ...partial, user };
}

export async function resolvePermissions(
  user: ForumUser | null,
  permissionsAdapter?: ForumPermissionsAdapter,
): Promise<ForumPermission[]> {
  if (permissionsAdapter) return permissionsAdapter.resolvePermissions(user);
  return permissionsForUser(user);
}

export async function buildRuntimeContext(
  reqCtx: ForumRequestContext,
  state: ForumContextState,
  permissions: ForumPermission[],
): Promise<ForumRuntimeContext> {
  const locale = state.config.locale ?? "en";
  const messages = state.config.messages ?? createMessageAdapter(locale);
  const components = { ...createDefaultComponents(), ...state.config.components };

  return {
    basePath: reqCtx.basePath,
    locale,
    t: messages.t.bind(messages),
    user: reqCtx.user,
    permissions,
    can: (p) => hasForumPermission(permissions, p),
    url: (path) => {
      const p = path.startsWith("/") ? path : `/${path}`;
      return `${reqCtx.basePath}${p}`.replace(/\/{2,}/g, "/");
    },
    components,
  };
}

export function forumRedirect(basePath: string, location: string, status = 303): never {
  redirect(safeRedirectPath(location, basePath), status);
}

export function forumForbidden(): never {
  fail(403, { message: "Forbidden", formErrors: ["You are not allowed to perform this action."] });
}

export function forumNotFound(): never {
  fail(404, { message: "Not found" });
}

export function forumValidationFail(errors: {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  values?: Record<string, string>;
}): never {
  validationError(errors);
}

export function checkForumRateLimit(
  config: ForumConfig,
  key: string,
  kind: "post" | "thread",
): void {
  const rl = config.rateLimit;
  if (!rl) return;
  const max = kind === "thread" ? (rl.maxThreads ?? 5) : (rl.maxPosts ?? 20);
  const windowMs = rl.windowMs ?? 60_000;
  const result = checkRateLimit(key, max, windowMs);
  if (!result.allowed) {
    fail(429, { message: "Too many requests", formErrors: ["Rate limit exceeded. Please try again later."] });
  }
}

export function buildThreadHead(
  title: string,
  description: string,
  canonical: string,
  origin?: string,
  options: { noindex?: boolean; jsonLd?: Record<string, unknown> } = {},
): OtokHead {
  const head: OtokHead = {
    title,
    description,
    links: [{ rel: "canonical", href: origin ? `${origin}${canonical}` : canonical }],
    propertyMeta: {
      "og:title": title,
      "og:description": description,
      "og:type": "article",
    },
  };
  if (options.noindex) {
    head.meta = { robots: "noindex, nofollow" };
  }
  if (options.jsonLd) {
    head.jsonLd = options.jsonLd as OtokHead["jsonLd"];
  }
  return head;
}

export type { ForumAuthAdapter };
