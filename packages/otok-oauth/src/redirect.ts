import { safeRedirectPath } from "@kamod-ch/otok-auth/redirect";

/** Only same-origin relative paths within an optional allowlist. */
export function safeNextPath(
  raw: string | null | undefined,
  allowlist?: readonly string[],
): string | null {
  return safeRedirectPath(raw, allowlist ?? ["/"]);
}
