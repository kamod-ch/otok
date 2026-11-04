import { OAuthProviderClient } from "./client.js";
import type { OAuthProviderConfig } from "./types.js";

export const DEFAULT_GITLAB_SCOPES = ["read_user"] as const;

export type GitLabProviderConfig = OAuthProviderConfig & {
  /** GitLab base URL. Defaults to `https://gitlab.com`. */
  baseURL?: string;
};

export function gitlabScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GITLAB_SCOPES];
}

export function createGitLabClient(config: GitLabProviderConfig): OAuthProviderClient {
  const baseURL = (config.baseURL ?? "https://gitlab.com").replace(/\/+$/, "");
  return new OAuthProviderClient(config, {
    authorizationServer: {
      issuer: baseURL,
      authorization_endpoint: `${baseURL}/oauth/authorize`,
      token_endpoint: `${baseURL}/oauth/token`,
    },
  });
}

export type { OAuthProviderConfig };
