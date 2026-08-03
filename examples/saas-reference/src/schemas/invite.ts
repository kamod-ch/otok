import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member"]),
});

export type InviteInput = z.infer<typeof inviteSchema>;
