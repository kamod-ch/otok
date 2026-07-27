import { GitHub } from "arctic";
import { DEFAULT_GITHUB_SCOPES, type OAuthProviderConfig } from "./types.js";

export function createGitHubClient(config: OAuthProviderConfig): GitHub {
  return new GitHub(config.clientId, config.clientSecret, config.redirectUri);
}

export function githubScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GITHUB_SCOPES];
}

export { DEFAULT_GITHUB_SCOPES };
export type { OAuthProviderConfig };
