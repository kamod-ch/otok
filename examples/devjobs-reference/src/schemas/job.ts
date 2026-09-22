import { z } from "zod";

export const jobFormSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  visibility: z.enum(["public", "private"]),
});

export const importCsvSchema = z.object({
  csv: z.string().min(1).max(32 * 1024),
});
