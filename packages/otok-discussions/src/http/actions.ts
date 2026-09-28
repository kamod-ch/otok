import type { OtokActionContext } from "@kamod-ch/otok/server";
import { redirect } from "@kamod-ch/otok/server";
import {
  createCommentFormSchema,
  deleteCommentFormSchema,
  editCommentFormSchema,
  reactionFormSchema,
  reportFormSchema,
  validationErrorFromZod,
} from "./validation.js";
import { discussionsValidationFail, rethrowDiscussionError } from "./errors.js";
import { assertMutationAuth, getDiscussionsState } from "./context.js";
import { safeRedirectPath } from "./utils.js";
import { DiscussionError } from "../types/errors.js";
import { discussionsThreadViewUrl } from "../ui/thread-url.js";
import { invalidateDiscussionThreadCache } from "./cache-invalidate.js";
import type { DiscussionSubject } from "../types/domain.js";

async function invalidateAfterThreadMutation(
  state: ReturnType<typeof getDiscussionsState>,
  reqCtx: { tenantId: string },
  subjectId: string,
): Promise<void> {
  const subject: DiscussionSubject = {
    tenantId: reqCtx.tenantId,
    subjectType: state.options.subjectType,
    subjectId,
  };
  await invalidateDiscussionThreadCache(state.options.cacheInvalidation, state.basePath, subject);
}

const REPORT_DUPLICATE_MESSAGE = "Du hast diesen Beitrag bereits gemeldet.";

export type DiscussionActionIntent = "comment" | "reply" | "edit" | "delete" | "react" | "report";

/** Intents that should include `_idempotency` in HTML forms (see docs/http-idempotency.md). */
export const IDEMPOTENT_FORM_INTENTS: readonly DiscussionActionIntent[] = [
  "comment",
  "reply",
  "edit",
  "delete",
  "report",
];

export async function runDiscussionThreadAction(ctx: OtokActionContext): Promise<void> {
  const state = getDiscussionsState(ctx.hono);
  const intent = String(ctx.formData?.get("intent") ?? "") as DiscussionActionIntent;
  const reqCtx = await assertMutationAuth(ctx, state);
  const { comments, moderation, discussion } = state.services;
  const basePath = state.basePath;
  const subjectId = ctx.params.subjectId!;
  const redirectTo = safeRedirectPath(
    String(ctx.formData?.get("redirectTo") ?? discussionsThreadUrl(basePath, subjectId)),
    basePath,
  );

  try {
    switch (intent) {
      case "comment":
      case "reply": {
        const parsed = createCommentFormSchema.safeParse({
          bodyMarkdown: String(ctx.formData?.get("bodyMarkdown") ?? ""),
          parentCommentId: String(ctx.formData?.get("parentCommentId") ?? "") || undefined,
        });
        if (!parsed.success) {
          discussionsValidationFail({
            ...validationErrorFromZod(parsed.error),
            values: { bodyMarkdown: String(ctx.formData?.get("bodyMarkdown") ?? "") },
          });
        }
        const { thread } = await discussion.getOrCreateThread(reqCtx, {
          title: "Discussion",
          ...state.options.threadDefaults,
        });
        await comments.createComment(reqCtx, {
          threadId: thread.id,
          bodyMarkdown: parsed.data.bodyMarkdown,
          parentCommentId: intent === "reply" ? (parsed.data.parentCommentId ?? null) : null,
        });
        await invalidateAfterThreadMutation(state, reqCtx, subjectId);
        redirect(redirectTo, 303);
      }
      case "edit": {
        const parsed = editCommentFormSchema.safeParse({
          commentId: String(ctx.formData?.get("commentId") ?? ""),
          bodyMarkdown: String(ctx.formData?.get("bodyMarkdown") ?? ""),
        });
        if (!parsed.success) {
          discussionsValidationFail({ ...validationErrorFromZod(parsed.error) });
        }
        await comments.editComment(reqCtx, parsed.data);
        await invalidateAfterThreadMutation(state, reqCtx, subjectId);
        redirect(redirectTo, 303);
      }
      case "delete": {
        const parsed = deleteCommentFormSchema.safeParse({
          commentId: String(ctx.formData?.get("commentId") ?? ""),
        });
        if (!parsed.success) {
          discussionsValidationFail({ ...validationErrorFromZod(parsed.error) });
        }
        await comments.deleteComment(reqCtx, parsed.data.commentId);
        await invalidateAfterThreadMutation(state, reqCtx, subjectId);
        redirect(redirectTo, 303);
      }
      case "react": {
        const parsed = reactionFormSchema.safeParse({
          commentId: String(ctx.formData?.get("commentId") ?? ""),
          emoji: String(ctx.formData?.get("emoji") ?? ""),
          mode: String(ctx.formData?.get("mode") ?? "set"),
          reactionId: String(ctx.formData?.get("reactionId") ?? "") || undefined,
        });
        if (!parsed.success) {
          discussionsValidationFail({ ...validationErrorFromZod(parsed.error) });
        }
        if (parsed.data.mode === "remove" && parsed.data.reactionId) {
          await comments.removeReaction(reqCtx, parsed.data.reactionId);
        } else {
          await comments.addReaction(reqCtx, {
            commentId: parsed.data.commentId,
            emoji: parsed.data.emoji,
          });
        }
        await invalidateAfterThreadMutation(state, reqCtx, subjectId);
        redirect(redirectTo, 303);
      }
      case "report": {
        const parsed = reportFormSchema.safeParse({
          targetType: String(ctx.formData?.get("targetType") ?? ""),
          targetId: String(ctx.formData?.get("targetId") ?? ""),
          reason: String(ctx.formData?.get("reason") ?? ""),
          details: String(ctx.formData?.get("details") ?? "") || undefined,
        });
        if (!parsed.success) {
          discussionsValidationFail({ ...validationErrorFromZod(parsed.error) });
        }
        try {
          await moderation.createReport(reqCtx, parsed.data);
        } catch (error) {
          if (error instanceof DiscussionError && error.code === "CONFLICT") {
            discussionsValidationFail({ formErrors: [REPORT_DUPLICATE_MESSAGE] });
          }
          throw error;
        }
        redirect(discussionsThreadViewUrl(basePath, subjectId, { reportAck: true }), 303);
      }
      default:
        discussionsValidationFail({ formErrors: [`Unknown intent: ${intent}`] });
    }
  } catch (error) {
    rethrowDiscussionError(error);
  }
}

export function discussionsThreadUrl(basePath: string, subjectId: string): string {
  return `${basePath}/${encodeURIComponent(subjectId)}/thread`.replace(/\/{2,}/g, "/");
}

export function discussionsPreviewUrl(basePath: string, subjectId: string): string {
  return `${basePath}/${encodeURIComponent(subjectId)}`.replace(/\/{2,}/g, "/");
}
