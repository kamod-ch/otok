import { z } from "zod";
import { normalizeCommentBody } from "../security/content.js";

export const commentBodySchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeCommentBody(value) : value),
  z.string().min(1, "Comment is required").max(10_000),
);

export const createCommentFormSchema = z.object({
  bodyMarkdown: commentBodySchema,
  parentCommentId: z.string().min(1).optional(),
});

export const editCommentFormSchema = z.object({
  commentId: z.string().min(1, "Comment id is required"),
  bodyMarkdown: commentBodySchema,
});

export const deleteCommentFormSchema = z.object({
  commentId: z.string().min(1, "Comment id is required"),
});

export const reactionFormSchema = z.object({
  commentId: z.string().min(1),
  emoji: z.enum(["👍", "👎"]),
  mode: z.enum(["set", "remove"]).default("set"),
  reactionId: z.string().optional(),
});

export const reportFormSchema = z.object({
  targetType: z.enum(["thread", "comment"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
  details: z.string().trim().max(2000).optional(),
});

export const listQuerySchema = z.object({
  sort: z.enum(["newest", "oldest", "top"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function validationErrorFromZod(error: z.ZodError): {
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
} {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    if (path === "_form") formErrors.push(issue.message);
    else fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
  }
  return { fieldErrors, formErrors };
}
