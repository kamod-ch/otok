import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Organization name required").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only")
    .optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
