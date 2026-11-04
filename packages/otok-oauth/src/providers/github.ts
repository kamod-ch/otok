import { OAuthProviderClient } from "./client.js";
import { DEFAULT_GITHUB_SCOPES, type OAuthProviderConfig } from "./types.js";

export function createGitHubClient(config: OAuthProviderConfig): OAuthProviderClient {
  return new OAuthProviderClient(config, {
    authorizationServer: {
      issuer: "https://github.com",
      authorization_endpoint: "https://github.com/login/oauth/authorize",
      token_endpoint: "https://github.com/login/oauth/access_token",
    },
  });
}

export function githubScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GITHUB_SCOPES];
}

export { DEFAULT_GITHUB_SCOPES };
export type { OAuthProviderConfig };
