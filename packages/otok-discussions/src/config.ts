import { z } from "zod";
import { DiscussionError } from "./types/errors.js";
import type { DiscussionRulesConfig } from "./domain/rules.js";
import type { Clock, EventSink, IdProvider } from "./types/ports.js";

const paginationSchema = z.object({
  defaultPageSize: z.number().int().min(1).max(100).default(20),
  maxPageSize: z.number().int().min(1).max(200).default(100),
});

const rateLimitSchema = z.object({
  windowMs: z.number().int().min(1_000).default(60_000),
  maxCommentsPerWindow: z.number().int().min(1).default(30),
  maxThreadsPerWindow: z.number().int().min(1).default(10),
});

export const discussionsConfigSchema = z.object({
  pagination: paginationSchema.default({}),
  rateLimit: rateLimitSchema.default({}),
  moderationMode: z.enum(["pre", "post", "trusted"]).default("post"),
  trustedRole: z.string().min(1).default("trusted"),
  maxCommentLength: z.number().int().min(1).max(100_000).default(10_000),
  maxThreadTitleLength: z.number().int().min(1).max(500).default(200),
  maxDepth: z.number().int().min(0).max(32).default(8),
  editWindowMs: z.number().int().min(0).max(86_400_000).default(900_000),
  deletedParentPlaceholder: z.string().min(1).max(500).default("[deleted]"),
});

export type DiscussionsConfigInput = z.input<typeof discussionsConfigSchema>;
export type DiscussionsConfig = z.output<typeof discussionsConfigSchema>;

export interface DiscussionsRuntimeDeps {
  clock: Clock;
  ids: IdProvider;
  events: EventSink;
}

export interface DiscussionsRuntime {
  config: DiscussionsConfig;
  rules: DiscussionRulesConfig;
  deps: DiscussionsRuntimeDeps;
}

export function parseDiscussionsConfig(input: unknown): DiscussionsConfig {
  const result = discussionsConfigSchema.safeParse(input ?? {});
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".") || "config"}: ${i.message}`).join("; ");
    throw new DiscussionError("INVALID_INPUT", message);
  }
  return result.data;
}

export function toDiscussionRules(config: DiscussionsConfig): DiscussionRulesConfig {
  return {
    maxCommentLength: config.maxCommentLength,
    maxThreadTitleLength: config.maxThreadTitleLength,
    maxDepth: config.maxDepth,
    editWindowMs: config.editWindowMs,
    moderationMode: config.moderationMode,
    trustedRole: config.trustedRole,
    deletedParentPlaceholder: config.deletedParentPlaceholder,
  };
}

export function createDiscussionsRuntime(input: unknown, deps: DiscussionsRuntimeDeps): DiscussionsRuntime {
  const config = parseDiscussionsConfig(input);
  if (!deps.clock || !deps.ids || !deps.events) {
    throw new DiscussionError("NOT_CONFIGURED", "Discussions runtime requires clock, ids, and events providers");
  }
  return { config, rules: toDiscussionRules(config), deps };
}
