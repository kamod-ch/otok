import { Google } from "arctic";
import { DEFAULT_GOOGLE_SCOPES, type OAuthProviderConfig } from "./types.js";

export function createGoogleClient(config: OAuthProviderConfig): Google {
  return new Google(config.clientId, config.clientSecret, config.redirectUri);
}

export function googleScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GOOGLE_SCOPES];
}

export { DEFAULT_GOOGLE_SCOPES };
export type { OAuthProviderConfig };
