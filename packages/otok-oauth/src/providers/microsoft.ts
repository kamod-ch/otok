import { OAuthProviderClient } from "./client.js";
import type { OAuthProviderConfig } from "./types.js";

export const DEFAULT_MICROSOFT_SCOPES = ["openid", "email", "profile", "User.Read"] as const;

export type MicrosoftProviderConfig = OAuthProviderConfig & {
  /** Entra ID tenant. Defaults to `common`. */
  tenant?: string;
};

export function microsoftScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_MICROSOFT_SCOPES];
}

export function createMicrosoftClient(config: MicrosoftProviderConfig): OAuthProviderClient {
  const tenant = encodeURIComponent(config.tenant ?? "common");
  const issuerBase = `https://login.microsoftonline.com/${tenant}`;
  return new OAuthProviderClient(config, {
    authorizationServer: {
      issuer: `${issuerBase}/v2.0`,
      authorization_endpoint: `${issuerBase}/oauth2/v2.0/authorize`,
      token_endpoint: `${issuerBase}/oauth2/v2.0/token`,
    },
  });
}

export type { OAuthProviderConfig };
