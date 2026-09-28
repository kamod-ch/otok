import type { CommentStatus, ModerationMode } from "../types/domain.js";

/**
 * Trust level is **always supplied by the host app** (via actor roles or explicit resolver).
 * The plugin never computes hidden reputation scores.
 */
export type AuthorTrustLevel = "standard" | "trusted" | "restricted";

const TRUSTED_ROLE_FALLBACK = "discussions_trusted";

/**
 * Maps app trust + configured moderation mode to initial comment visibility.
 * Missing trust defaults to `standard` (safest public default).
 */
export function resolveInitialStatusFromTrust(input: {
  moderationMode: ModerationMode;
  trustLevel?: AuthorTrustLevel;
  trustedRole?: string;
  actorRoles?: readonly string[];
}): CommentStatus {
  const trust =
    input.trustLevel ??
    (input.actorRoles?.includes(input.trustedRole ?? TRUSTED_ROLE_FALLBACK) ? "trusted" : "standard");

  if (trust === "restricted") return "pending";
  if (input.moderationMode === "pre") return "pending";
  if (input.moderationMode === "trusted" && trust === "trusted") return "published";
  return "published";
}

export function authorTrustLevelFromRoles(
  roles: readonly string[],
  trustedRole = TRUSTED_ROLE_FALLBACK,
): AuthorTrustLevel {
  if (roles.includes("discussions_restricted")) return "restricted";
  if (roles.includes(trustedRole)) return "trusted";
  return "standard";
}
