import type { OAuthProviderConfig } from "./types.js";

export const DEFAULT_MICROSOFT_SCOPES = ["openid", "email", "profile", "User.Read"] as const;

export function microsoftScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_MICROSOFT_SCOPES];
}

/** Extension point — wire Arctic Microsoft when enabling this provider. */
export function createMicrosoftClient(_config: OAuthProviderConfig): never {
  throw new Error(
    "otok-oauth: Microsoft provider is an extension point. Import Arctic Microsoft and pass a custom client factory.",
  );
}

export type { OAuthProviderConfig };
