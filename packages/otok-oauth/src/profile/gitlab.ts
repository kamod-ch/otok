import type { OAuthProfile } from "../adapter/types.js";
import { OAuthFlowError } from "../errors.js";

type GitLabUser = {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  confirmed_at?: string | null;
};

export async function fetchGitLabProfile(
  accessToken: string,
  baseURL = "https://gitlab.com",
): Promise<OAuthProfile> {
  const origin = baseURL.replace(/\/+$/, "");
  const response = await fetch(`${origin}/api/v4/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OAuthFlowError("profile_error", `GitLab /api/v4/user failed with ${response.status}`);
  }

  const user = (await response.json()) as GitLabUser;
  if (user.id == null) {
    throw new OAuthFlowError("profile_error", "GitLab profile missing id");
  }

  return {
    provider: "gitlab",
    providerAccountId: String(user.id),
    email: user.email ?? null,
    emailVerified: Boolean(user.confirmed_at),
    name: user.name ?? user.username ?? null,
    avatarUrl: user.avatar_url ?? null,
  };
}
