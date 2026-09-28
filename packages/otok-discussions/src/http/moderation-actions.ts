import type { OtokActionContext } from "@kamod-ch/otok/server";
import { redirect } from "@kamod-ch/otok/server";
import { assertMutationAuth, getDiscussionsState } from "./context.js";
import { rethrowDiscussionError } from "./errors.js";
import { assertModerationReasonCode } from "../moderation/reason-codes.js";
import type { ModerationApplyCommand } from "../types/moderation.js";

export async function runModerationAction(ctx: OtokActionContext): Promise<void> {
  const state = getDiscussionsState(ctx.hono);
  const intent = String(ctx.formData?.get("intent") ?? "");
  if (intent !== "moderation_apply" && intent !== "moderation_bulk") return;

  const reqCtx = await assertMutationAuth(ctx, state);
  const redirectTo = String(ctx.formData?.get("redirectTo") ?? ctx.request.url);

  try {
    if (intent === "moderation_bulk") {
      const raw = String(ctx.formData?.get("items") ?? "[]");
      const items = JSON.parse(raw) as ModerationApplyCommand[];
      await state.services.moderation.applyBulk(reqCtx, { items });
      redirect(redirectTo, 303);
      return;
    }

    const action = String(ctx.formData?.get("action") ?? "") as ModerationApplyCommand["action"];
    const targetId = String(ctx.formData?.get("targetId") ?? "");
    const reasonCode = assertModerationReasonCode(String(ctx.formData?.get("reasonCode") ?? "other"));
    const reasonText = String(ctx.formData?.get("reasonText") ?? "") || undefined;
    const threadId = String(ctx.formData?.get("threadId") ?? "") || undefined;
    const blockUserId = String(ctx.formData?.get("blockUserId") ?? "") || undefined;

    await state.services.moderation.apply(reqCtx, {
      action,
      targetId,
      reasonCode,
      reasonText,
      threadId,
      blockUserId,
    });
    redirect(redirectTo, 303);
  } catch (error) {
    rethrowDiscussionError(error);
  }
}
