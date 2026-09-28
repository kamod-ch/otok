import type { Context, Hono } from "hono";
import type { DiscussionsContextState } from "./types.js";
import { buildDiscussionRequestContext } from "./context.js";
import { httpStatusForDiscussionError, jsonErrorBody } from "./errors.js";
import { DiscussionError } from "../types/errors.js";
import {
  createCommentFormSchema,
  reactionFormSchema,
  reportFormSchema,
  validationErrorFromZod,
} from "./validation.js";

export interface JsonApiOptions {
  pathPrefix: string;
  basePath: string;
  getState: (c: Context) => DiscussionsContextState;
}

function wantsJson(c: Context): boolean {
  const accept = c.req.header("accept") ?? "";
  const contentType = c.req.header("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

function jsonResponse(c: Context, status: number, body: unknown): Response {
  c.header("Content-Type", "application/json; charset=utf-8");
  return c.json(body, status as 200);
}

function handleError(c: Context, error: unknown): Response {
  if (error instanceof DiscussionError) {
    const status = httpStatusForDiscussionError(error.code);
    return jsonResponse(c, status, jsonErrorBody(error.code, error.message));
  }
  throw error;
}

export function registerDiscussionsJsonApi(app: Hono, options: JsonApiOptions): void {
  const prefix = options.pathPrefix.replace(/\/+$/, "");

  app.get(`${prefix}/:subjectId/comments`, async (c) => {
    if (!wantsJson(c)) return c.text("Accept application/json", 406);
    try {
      const state = options.getState(c);
      const reqCtx = await buildDiscussionRequestContext(
        { hono: c, request: c.req.raw, params: { subjectId: c.req.param("subjectId") }, route: c.req.path, signal: c.req.raw.signal },
        state,
      );
      const threadId = c.req.query("threadId");
      if (!threadId) {
        return jsonResponse(c, 400, jsonErrorBody("INVALID_INPUT", "threadId query is required"));
      }
      const page = await state.services.comments.listComments(reqCtx, {
        threadId,
        rootsOnly: c.req.query("rootsOnly") === "1",
        replyToCommentId: c.req.query("parentCommentId") ?? undefined,
        cursor: c.req.query("cursor") ?? undefined,
        sort: (c.req.query("sort") as "newest" | undefined) ?? "newest",
      });
      return jsonResponse(c, 200, page);
    } catch (error) {
      return handleError(c, error);
    }
  });

  app.post(`${prefix}/:subjectId/comments`, async (c) => {
    if (!wantsJson(c)) return c.text("Content-Type application/json required", 415);
    try {
      const state = options.getState(c);
      const body = await c.req.json();
      const parsed = createCommentFormSchema.safeParse(body);
      if (!parsed.success) {
        const err = validationErrorFromZod(parsed.error);
        return jsonResponse(c, 422, jsonErrorBody("INVALID_INPUT", "Validation failed", err));
      }
      const reqCtx = await buildDiscussionRequestContext(
        { hono: c, request: c.req.raw, params: { subjectId: c.req.param("subjectId") }, route: c.req.path, signal: c.req.raw.signal },
        state,
      );
      if (!reqCtx.sessionUserId) {
        return jsonResponse(c, 403, jsonErrorBody("ACTOR_REQUIRED", "Authentication required"));
      }
      const { thread } = await state.services.discussion.getOrCreateThread(reqCtx, {
        title: "Discussion",
        ...state.options.threadDefaults,
      });
      const comment = await state.services.comments.createComment(reqCtx, {
        threadId: thread.id,
        bodyMarkdown: parsed.data.bodyMarkdown,
        parentCommentId: parsed.data.parentCommentId ?? null,
      });
      return jsonResponse(c, 201, { comment });
    } catch (error) {
      return handleError(c, error);
    }
  });

  app.post(`${prefix}/:subjectId/reactions`, async (c) => {
    try {
      const state = options.getState(c);
      const body = await c.req.json();
      const parsed = reactionFormSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(c, 422, jsonErrorBody("INVALID_INPUT", "Validation failed", validationErrorFromZod(parsed.error)));
      }
      const reqCtx = await buildDiscussionRequestContext(
        { hono: c, request: c.req.raw, params: { subjectId: c.req.param("subjectId") }, route: c.req.path, signal: c.req.raw.signal },
        state,
      );
      if (!reqCtx.sessionUserId) {
        return jsonResponse(c, 403, jsonErrorBody("ACTOR_REQUIRED", "Authentication required"));
      }
      const reaction = await state.services.comments.addReaction(reqCtx, {
        commentId: parsed.data.commentId,
        emoji: parsed.data.emoji,
      });
      return jsonResponse(c, 200, { reaction });
    } catch (error) {
      return handleError(c, error);
    }
  });

  app.post(`${prefix}/:subjectId/reports`, async (c) => {
    try {
      const state = options.getState(c);
      const body = await c.req.json();
      const parsed = reportFormSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(c, 422, jsonErrorBody("INVALID_INPUT", "Validation failed", validationErrorFromZod(parsed.error)));
      }
      const reqCtx = await buildDiscussionRequestContext(
        { hono: c, request: c.req.raw, params: { subjectId: c.req.param("subjectId") }, route: c.req.path, signal: c.req.raw.signal },
        state,
      );
      if (!reqCtx.sessionUserId) {
        return jsonResponse(c, 403, jsonErrorBody("ACTOR_REQUIRED", "Authentication required"));
      }
      const report = await state.services.moderation.createReport(reqCtx, parsed.data);
      return jsonResponse(c, 201, { report });
    } catch (error) {
      return handleError(c, error);
    }
  });
}
