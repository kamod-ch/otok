import { z } from "zod";

export const checkoutSchema = z.object({
  plan: z.enum(["pro", "team"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
