export type OAuthProviderId = "github" | "google";

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
}
