import { z } from "zod";
import { listQuerySchema } from "./validation.js";

export const threadViewQuerySchema = listQuerySchema.extend({
  /** Open inline report form for this comment id (no-JS friendly). */
  report: z.string().min(1).optional(),
  /** Open inline edit form for this comment id. */
  edit: z.string().min(1).optional(),
  /** Scroll/focus target comment (permalink / deep link). */
  focus: z.string().min(1).optional(),
  reportAck: z.enum(["1"]).optional(),
});

export type ThreadViewQuery = z.infer<typeof threadViewQuerySchema>;

export function parseThreadViewQuery(url: URL): ThreadViewQuery {
  const raw = Object.fromEntries(url.searchParams);
  const parsed = threadViewQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}
