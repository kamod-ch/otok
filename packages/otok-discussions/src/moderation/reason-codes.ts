/** Stable reason codes stored in immutable moderation audit metadata. */
export const MODERATION_REASON_CODES = [
  "spam",
  "abuse",
  "off_topic",
  "policy_violation",
  "duplicate",
  "user_request",
  "legal",
  "other",
] as const;

export type ModerationReasonCode = (typeof MODERATION_REASON_CODES)[number];

export function assertModerationReasonCode(code: string): ModerationReasonCode {
  if ((MODERATION_REASON_CODES as readonly string[]).includes(code)) {
    return code as ModerationReasonCode;
  }
  throw new Error(`Invalid moderation reason code: ${code}`);
}
