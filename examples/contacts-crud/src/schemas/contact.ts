import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
});

export const contactUpdateSchema = contactSchema;

export const contactIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ContactInput = z.infer<typeof contactSchema>;
