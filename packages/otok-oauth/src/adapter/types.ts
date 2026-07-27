export type OAuthProviderId = "github" | "google" | "microsoft" | "gitlab";

export type OAuthProfile = {
  provider: OAuthProviderId;
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

export interface OAuthAdapter<TUser> {
  findOrCreateUser(profile: OAuthProfile): Promise<TUser>;
  getUserId(user: TUser): string;
  /**
   * Link an OAuth account to an existing signed-in user.
   * Must verify the current session before linking.
   */
  linkAccount?(input: {
    user: TUser;
    profile: OAuthProfile;
  }): Promise<TUser>;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}

export interface OAuthTokenRefreshHandler {
  refresh(provider: OAuthProviderId, refreshToken: string): Promise<OAuthTokenSet>;
}
