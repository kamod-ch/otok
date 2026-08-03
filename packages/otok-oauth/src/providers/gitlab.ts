import { GitLab } from "arctic";
import type { OAuthProviderConfig } from "./types.js";

export const DEFAULT_GITLAB_SCOPES = ["read_user"] as const;

export type GitLabProviderConfig = OAuthProviderConfig & {
  /** GitLab base URL. Defaults to `https://gitlab.com`. */
  baseURL?: string;
};

export function gitlabScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GITLAB_SCOPES];
}

export function createGitLabClient(config: GitLabProviderConfig): GitLab {
  return new GitLab(
    config.baseURL ?? "https://gitlab.com",
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export type { OAuthProviderConfig };
