import { MicrosoftEntraId } from "arctic";
import type { OAuthProviderConfig } from "./types.js";

export const DEFAULT_MICROSOFT_SCOPES = ["openid", "email", "profile", "User.Read"] as const;

export type MicrosoftProviderConfig = OAuthProviderConfig & {
  /** Entra ID tenant. Defaults to `common`. */
  tenant?: string;
};

export function microsoftScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_MICROSOFT_SCOPES];
}

export function createMicrosoftClient(config: MicrosoftProviderConfig): MicrosoftEntraId {
  return new MicrosoftEntraId(
    config.tenant ?? "common",
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export type { OAuthProviderConfig };
