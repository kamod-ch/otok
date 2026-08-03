import type { OAuthProfile } from "../adapter/types.js";
import { OAuthFlowError } from "../errors.js";

type MicrosoftUserInfo = {
  id?: string;
  sub?: string;
  displayName?: string;
  name?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
  email?: string;
  email_verified?: boolean;
};

export async function fetchMicrosoftProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OAuthFlowError("profile_error", `Microsoft Graph /me failed with ${response.status}`);
  }

  const info = (await response.json()) as MicrosoftUserInfo;
  const providerAccountId = info.id ?? info.sub;
  if (!providerAccountId) {
    throw new OAuthFlowError("profile_error", "Microsoft profile missing id");
  }

  const email = info.mail ?? info.userPrincipalName ?? info.email ?? null;

  return {
    provider: "microsoft",
    providerAccountId: String(providerAccountId),
    email,
    emailVerified: Boolean(email),
    name: info.displayName ?? info.name ?? null,
    avatarUrl: null,
  };
}
