import type { OtokContext } from "@kamod-ch/otok/server";
import type { DiscussionSubject } from "../types/domain.js";
import type { DiscussionsContextState } from "../http/types.js";
import type { DiscussionRequestContext } from "../services/types.js";
import { pickDiscussionLocale, type DiscussionLocale } from "../i18n/create.js";

export async function resolveSubjectFromContext(
  state: DiscussionsContextState,
  reqCtx: DiscussionRequestContext,
): Promise<DiscussionSubject> {
  return state.options.subjectResolver.resolve({
    tenantId: reqCtx.tenantId,
    subjectType: reqCtx.subjectType,
    subjectId: reqCtx.subjectId,
  });
}

export async function resolveIsModerator(
  state: DiscussionsContextState,
  reqCtx: DiscussionRequestContext,
  subject: DiscussionSubject,
): Promise<boolean> {
  if (!reqCtx.sessionUserId) return false;
  const actor = await state.options.actorResolver.resolveActor({ userId: reqCtx.sessionUserId });
  if (!actor) return false;
  return Boolean(await state.options.moderation.isModerator(actor, subject));
}

export function currentRedirectPath(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.pathname}${url.search}`;
}

export async function resolveDiscussionsLocale(
  ctx: OtokContext,
  state: DiscussionsContextState,
): Promise<DiscussionLocale> {
  const custom = state.options.i18n?.resolveLocale;
  if (custom) return custom(ctx);
  return pickDiscussionLocale(ctx.request.headers.get("accept-language"), state.options.i18n?.defaultLocale ?? "de");
}

export function discussionsNowIso(state: DiscussionsContextState): string {
  return state.options.runtime.deps.clock.now().toISOString();
}
