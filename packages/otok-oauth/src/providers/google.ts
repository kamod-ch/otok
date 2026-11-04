import { OAuthProviderClient } from "./client.js";
import { DEFAULT_GOOGLE_SCOPES, type OAuthProviderConfig } from "./types.js";

export function createGoogleClient(config: OAuthProviderConfig): OAuthProviderClient {
  return new OAuthProviderClient(config, {
    authorizationServer: {
      issuer: "https://accounts.google.com",
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token",
    },
  });
}

export function googleScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GOOGLE_SCOPES];
}

export { DEFAULT_GOOGLE_SCOPES };
export type { OAuthProviderConfig };
