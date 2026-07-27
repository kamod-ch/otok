import type { OAuthProfile } from "../adapter/types.js";
import { OAuthFlowError } from "../errors.js";

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OAuthFlowError("profile_error", `Google userinfo failed with ${response.status}`);
  }

  const info = (await response.json()) as GoogleUserInfo;
  if (!info.sub) {
    throw new OAuthFlowError("profile_error", "Google userinfo missing sub");
  }

  return {
    provider: "google",
    providerAccountId: info.sub,
    email: info.email ?? null,
    emailVerified: Boolean(info.email_verified),
    name: info.name ?? null,
    avatarUrl: info.picture ?? null,
  };
}
