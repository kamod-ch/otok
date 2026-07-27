import type { OAuthProviderConfig } from "./types.js";

export const DEFAULT_GITLAB_SCOPES = ["read_user"] as const;

export function gitlabScopes(config: OAuthProviderConfig): string[] {
  return config.scopes ?? [...DEFAULT_GITLAB_SCOPES];
}

/** Extension point — wire Arctic GitLab when enabling this provider. */
export function createGitLabClient(_config: OAuthProviderConfig): never {
  throw new Error(
    "otok-oauth: GitLab provider is an extension point. Import Arctic GitLab and pass a custom client factory.",
  );
}

export type { OAuthProviderConfig };
