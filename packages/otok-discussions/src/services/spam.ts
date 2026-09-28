import type { ModerationMode } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";

export type SpamSignal = "allow" | "review" | "block";

export interface SpamCheckResult {
  signal: SpamSignal;
  reasonCode: string;
  provider: string;
  detail?: string;
}

export interface SpamCheckInput {
  tenantId: string;
  subjectType: string;
  subjectId: string;
  authorId: string;
  bodyMarkdown: string;
}

export interface SpamModerationProvider {
  checkComment(input: SpamCheckInput): Promise<SpamCheckResult>;
}

export type ProviderFailureBehavior = "fail_open" | "fail_closed";

const DEFAULT_FAILURE_BEHAVIOR: Record<ModerationMode, ProviderFailureBehavior> = {
  pre: "fail_closed",
  post: "fail_open",
  trusted: "fail_open",
};

export function resolveProviderFailureBehavior(
  mode: ModerationMode,
  overrides?: Partial<Record<ModerationMode, ProviderFailureBehavior>>,
): ProviderFailureBehavior {
  return overrides?.[mode] ?? DEFAULT_FAILURE_BEHAVIOR[mode];
}

export async function runSpamCheck(
  provider: SpamModerationProvider | undefined,
  input: SpamCheckInput,
  mode: ModerationMode,
  failureOverrides?: Partial<Record<ModerationMode, ProviderFailureBehavior>>,
): Promise<SpamCheckResult | null> {
  if (!provider) return null;
  try {
    return await provider.checkComment(input);
  } catch {
    const behavior = resolveProviderFailureBehavior(mode, failureOverrides);
    if (behavior === "fail_closed") {
      throw new DiscussionError("PROVIDER_UNAVAILABLE", "Spam moderation provider failed (fail-closed)");
    }
    return {
      signal: "allow",
      reasonCode: "provider_fail_open",
      provider: "fallback",
      detail: "Provider error; comment allowed by fail-open policy",
    };
  }
}
