import type { OtokActionContext, OtokContext } from "@kamod-ch/otok/server";
import { setOtokCacheScope } from "@kamod-ch/otok/server";
import { assertCsrf, CSRF_FIELD, ensureCsrfCookie, type CsrfOptions } from "@kamod-ch/otok-auth/csrf";
import type { DiscussionRequestContext } from "../services/types.js";
import type { DiscussionsContextState } from "./types.js";
import { discussionsForbidden } from "./errors.js";

export const DISCUSSIONS_CTX_KEY = "otokDiscussions";

type HonoVars = { set: (key: string, value: unknown) => void; get: (key: string) => unknown };

export function setDiscussionsState(hono: OtokContext["hono"], state: DiscussionsContextState): void {
  (hono as unknown as HonoVars).set(DISCUSSIONS_CTX_KEY, state);
}

export function getDiscussionsState(hono: OtokContext["hono"]): DiscussionsContextState {
  const state = (hono as unknown as HonoVars).get(DISCUSSIONS_CTX_KEY);
  if (!state) {
    throw new Error("@kamod-ch/otok-discussions: discussions middleware not applied");
  }
  return state as DiscussionsContextState;
}

export async function buildDiscussionRequestContext(
  ctx: OtokContext | OtokActionContext,
  state: DiscussionsContextState,
): Promise<DiscussionRequestContext> {
  const scope = await state.options.auth.resolveVerifiedScope(ctx);
  setOtokCacheScope(ctx.hono, {
    tenantId: scope.tenantId,
    userId: scope.sessionUserId ?? undefined,
  });
  return {
    tenantId: scope.tenantId,
    subjectType: state.options.subjectType,
    subjectId: ctx.params.subjectId!,
    sessionUserId: scope.sessionUserId,
  };
}

/** Tenant-scoped moderation routes without `:subjectId` in the URL. */
export async function buildModerationRequestContext(
  ctx: OtokContext | OtokActionContext,
  state: DiscussionsContextState,
): Promise<DiscussionRequestContext> {
  const scope = await state.options.auth.resolveVerifiedScope(ctx);
  setOtokCacheScope(ctx.hono, {
    tenantId: scope.tenantId,
    userId: scope.sessionUserId ?? undefined,
  });
  return {
    tenantId: scope.tenantId,
    subjectType: state.options.subjectType,
    subjectId: ctx.params.subjectId ?? "__moderation__",
    sessionUserId: scope.sessionUserId,
  };
}

export function resolveCsrfOptions(state: DiscussionsContextState): CsrfOptions | undefined {
  const csrf = state.options.csrf;
  if (csrf === false || csrf === undefined) return undefined;
  if (csrf === true) return {};
  return csrf;
}

export function ensureLoaderCsrf(ctx: OtokContext, state: DiscussionsContextState): string | undefined {
  if (!state.options.auth.usesCookieSession) return undefined;
  const options = resolveCsrfOptions(state);
  return ensureCsrfCookie(ctx.hono, options ?? {});
}

export function assertMutationCsrf(ctx: OtokActionContext, state: DiscussionsContextState): void {
  if (!state.options.auth.usesCookieSession) return;
  assertCsrf(ctx.hono, ctx.formData, resolveCsrfOptions(state) ?? {});
}

export async function assertMutationAuth(ctx: OtokActionContext, state: DiscussionsContextState): Promise<DiscussionRequestContext> {
  assertMutationCsrf(ctx, state);
  const reqCtx = await buildDiscussionRequestContext(ctx, state);
  if (!reqCtx.sessionUserId) {
    discussionsForbidden("Authentication required");
  }
  return reqCtx;
}

export { CSRF_FIELD };
