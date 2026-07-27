import type { OAuthProfile } from "../adapter/types.js";
import { OAuthFlowError } from "../errors.js";

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function fetchGitHubProfile(accessToken: string): Promise<OAuthProfile> {
  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "otok-oauth",
      },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "otok-oauth",
      },
    }),
  ]);

  if (!userRes.ok) {
    throw new OAuthFlowError("profile_error", `GitHub /user failed with ${userRes.status}`);
  }

  const user = (await userRes.json()) as GitHubUser;
  let email: string | null = user.email;
  let emailVerified = false;

  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as GitHubEmail[];
    const primary =
      emails.find((entry) => entry.primary && entry.verified) ??
      emails.find((entry) => entry.verified) ??
      emails.find((entry) => entry.primary) ??
      null;
    if (primary) {
      email = primary.email;
      emailVerified = primary.verified;
    }
  }

  return {
    provider: "github",
    providerAccountId: String(user.id),
    email,
    emailVerified,
    name: user.name ?? user.login ?? null,
    avatarUrl: user.avatar_url ?? null,
  };
}
