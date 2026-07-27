export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
};

export const DEFAULT_GITHUB_SCOPES = ["user:email"] as const;
export const DEFAULT_GOOGLE_SCOPES = ["openid", "email", "profile"] as const;
