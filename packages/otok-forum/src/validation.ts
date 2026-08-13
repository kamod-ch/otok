import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(SLUG_PATTERN, "Slug must be lowercase alphanumeric with hyphens");

export const titleSchema = z.string().trim().min(3, "Title must be at least 3 characters").max(200);

export const postContentSchema = z
  .string()
  .trim()
  .min(1, "Post content is required")
  .max(50_000, "Post content is too long");

export const categoryIdSchema = z.string().uuid("Invalid category");

export const threadIdSchema = z.string().uuid("Invalid thread");

export const postIdSchema = z.string().uuid("Invalid post");

export const tagNamesSchema = z.array(z.string().trim().min(1).max(40)).max(10).optional();

export const reportReasonSchema = z.string().trim().min(1).max(100);

export const reportDetailsSchema = z.string().trim().max(2000).optional();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.enum(["recent", "popular", "pinned"]).default("recent");

export const createThreadSchema = z.object({
  categoryId: categoryIdSchema,
  title: titleSchema,
  content: postContentSchema,
  tags: z.string().optional(),
});

export const createPostSchema = z.object({
  threadId: threadIdSchema,
  content: postContentSchema,
  parentPostId: z.string().uuid().optional(),
});

export const editPostSchema = z.object({
  postId: postIdSchema,
  content: postContentSchema,
});

export const editThreadSchema = z.object({
  threadId: threadIdSchema,
  title: titleSchema,
});

export const reportSchema = z.object({
  targetType: z.enum(["thread", "post"]),
  targetId: z.string().uuid(),
  reason: reportReasonSchema,
  details: reportDetailsSchema,
});

export const reactionSchema = z.object({
  postId: postIdSchema,
  emoji: z.string().min(1).max(32),
  action: z.enum(["add", "remove"]).default("add"),
});

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
});

export type CreateThreadForm = z.infer<typeof createThreadSchema>;
export type CreatePostForm = z.infer<typeof createPostSchema>;
export type EditPostForm = z.infer<typeof editPostSchema>;
export type ReportForm = z.infer<typeof reportSchema>;

export function parseTagsInput(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function validationErrorFromZod(error: z.ZodError): {
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
} {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    if (path === "_form") {
      formErrors.push(issue.message);
    } else {
      fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
    }
  }
  return { fieldErrors, formErrors };
}
